import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { QuizExam } from '../types';

// jsPDF's built-in fonts don't render Vietnamese diacritics. Instead of embedding a
// custom font, we lay the exam out as real HTML (so the browser's own font handles
// Vietnamese correctly), rasterize it with html2canvas, then slice that single tall
// image across as many A4 pages as needed.
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

export function buildExamHtml(exam: QuizExam): string {
  const metaLine = [
    exam.schoolName,
    exam.className && `Lớp ${exam.className}`,
    exam.grade && `Khối ${exam.grade}`,
    exam.schoolYear,
  ]
    .filter(Boolean)
    .map((s) => escapeHtml(String(s)))
    .join(' &middot; ');

  const questionsHtml = exam.questions
    .map((q, idx) => {
      const optionsHtml = q.options
        .map((opt) => `<div style="margin:3px 0 3px 16px;">${escapeHtml(opt.id.toUpperCase())}. ${escapeHtml(opt.text)}</div>`)
        .join('');
      return `
        <div style="margin-bottom:14px; break-inside:avoid;">
          <div style="font-weight:bold;">Câu ${idx + 1}: ${escapeHtml(q.question)}</div>
          ${optionsHtml}
        </div>
      `;
    })
    .join('');

  return `
    <h1 style="font-size:20px; margin:0 0 4px 0;">${escapeHtml(exam.title)}</h1>
    ${metaLine ? `<div style="font-size:12px; color:#475569; margin-bottom:20px;">${metaLine}</div>` : '<div style="margin-bottom:20px;"></div>'}
    ${questionsHtml}
    <hr style="margin:24px 0; border:none; border-top:1px solid #cbd5e1;" />
    <h2 style="font-size:15px; margin:0 0 8px 0;">Đáp Án</h2>
    ${buildAnswerKeyTableHtml(exam)}
  `;
}

// Renders the answer key as a 2-row table — a "Câu N" header row over a row of
// correct-option letters — matching the format teachers already use when
// uploading exam files (see extractBareAnswerTable in api/_app.ts), split into
// blocks of 10 columns so it stays readable once there are more than a handful
// of questions.
const ANSWER_TABLE_CHUNK_SIZE = 10;

function buildAnswerKeyTableHtml(exam: QuizExam): string {
  const cellStyle = 'border:1px solid #94a3b8; padding:6px 4px; text-align:center;';
  let tablesHtml = '';
  for (let i = 0; i < exam.questions.length; i += ANSWER_TABLE_CHUNK_SIZE) {
    const chunk = exam.questions.slice(i, i + ANSWER_TABLE_CHUNK_SIZE);
    const headerCells = chunk
      .map((_, j) => `<td style="${cellStyle} font-weight:bold;">Câu ${i + j + 1}</td>`)
      .join('');
    const answerCells = chunk
      .map((q) => `<td style="${cellStyle}">${escapeHtml(q.correctOptionId.toUpperCase())}</td>`)
      .join('');
    tablesHtml += `
      <table style="border-collapse:collapse; width:100%; margin-bottom:10px; font-size:13px;">
        <tr>${headerCells}</tr>
        <tr>${answerCells}</tr>
      </table>
    `;
  }
  return tablesHtml;
}

// Real .docx (OOXML) export, mirroring the same title/meta/questions/answer-key
// layout as buildExamHtml above so the Word file matches the PDF and the on-screen
// preview.
export async function generateExamWordBlob(exam: QuizExam): Promise<Blob> {
  const metaParts = [
    exam.schoolName,
    exam.className && `Lớp ${exam.className}`,
    exam.grade && `Khối ${exam.grade}`,
    exam.schoolYear,
  ].filter(Boolean) as string[];

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: exam.title, bold: true })],
    }),
  ];

  if (metaParts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: metaParts.join(' · '), italics: true, color: '475569' })],
        spacing: { after: 200 },
      })
    );
  }

  exam.questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Câu ${idx + 1}: ${q.question}`, bold: true })],
        spacing: { before: 200, after: 80 },
      })
    );
    q.options.forEach((opt) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${opt.id.toUpperCase()}. ${opt.text}` })],
          indent: { left: 360 },
        })
      );
    });
  });

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Đáp Án', bold: true })],
      spacing: { before: 400, after: 120 },
    })
  );
  children.push(...buildAnswerKeyTables(exam.questions));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

// Same 2-row "Câu N" / letter table as buildAnswerKeyTableHtml, built with docx's
// Table API instead of raw HTML, chunked the same way so long exams still read
// as several 10-column blocks rather than one unreadably wide table.
function buildAnswerKeyTables(questions: QuizExam['questions']): (Paragraph | Table)[] {
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
  };
  const cell = (text: string, bold: boolean) =>
    new TableCell({
      borders: cellBorders,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold })] })],
    });

  const result: (Paragraph | Table)[] = [];
  for (let i = 0; i < questions.length; i += ANSWER_TABLE_CHUNK_SIZE) {
    const chunk = questions.slice(i, i + ANSWER_TABLE_CHUNK_SIZE);
    result.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: chunk.map((_, j) => cell(`Câu ${i + j + 1}`, true)) }),
          new TableRow({ children: chunk.map((q) => cell(q.correctOptionId.toUpperCase(), false)) }),
        ],
      })
    );
    result.push(new Paragraph({ spacing: { after: 120 } }));
  }
  return result;
}

export async function generateExamPdfBlob(exam: QuizExam): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = '794px'; // ~A4 width at 96dpi
  container.style.padding = '32px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Arial, "Segoe UI", sans-serif';
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.5';
  container.innerHTML = buildExamHtml(exam);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ unit: 'px', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}
