import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { ExamAttempt } from '../types';
import { escapeHtml, renderHtmlToPdfBlob } from './examPdf';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

function toScore10(attempt: ExamAttempt): string {
  return (attempt.percentage / 10).toFixed(1).replace('.', ',');
}

export function buildAttemptsHtml(examTitle: string, attempts: ExamAttempt[]): string {
  const rowsHtml = attempts
    .map((a, idx) => {
      const cellStyle = 'border:1px solid #cbd5e1; padding:6px 8px;';
      return `
        <tr>
          <td style="${cellStyle} text-align:center;">${idx + 1}</td>
          <td style="${cellStyle}">${escapeHtml(a.userName)}</td>
          <td style="${cellStyle} text-align:center;">${toScore10(a)}</td>
          <td style="${cellStyle} text-align:center;">${a.score}/${a.maxScore} (${a.percentage}%)</td>
          <td style="${cellStyle} text-align:center;">${a.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</td>
          <td style="${cellStyle}">${escapeHtml(formatDate(a.completedAt))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <h1 style="font-size:20px; margin:0 0 4px 0;">${escapeHtml(examTitle)}</h1>
    <div style="font-size:12px; color:#475569; margin-bottom:20px;">${attempts.length} thí sinh đã làm bài</div>
    <table style="border-collapse:collapse; width:100%; font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center;">STT</th>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Họ và Tên</th>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center;">Điểm</th>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center;">Số Câu</th>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center;">Kết Quả</th>
          <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Ngày Nộp</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

export async function generateAttemptsPdfBlob(examTitle: string, attempts: ExamAttempt[]): Promise<Blob> {
  return renderHtmlToPdfBlob(buildAttemptsHtml(examTitle, attempts));
}

export async function generateAttemptsWordBlob(examTitle: string, attempts: ExamAttempt[]): Promise<Blob> {
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
  };
  const cell = (text: string, opts?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }) =>
    new TableCell({
      borders: cellBorders,
      children: [
        new Paragraph({
          alignment: opts?.align ?? AlignmentType.LEFT,
          children: [new TextRun({ text, bold: opts?.bold })],
        }),
      ],
    });

  const headerRow = new TableRow({
    children: [
      cell('STT', { bold: true, align: AlignmentType.CENTER }),
      cell('Họ và Tên', { bold: true }),
      cell('Điểm', { bold: true, align: AlignmentType.CENTER }),
      cell('Số Câu', { bold: true, align: AlignmentType.CENTER }),
      cell('Kết Quả', { bold: true, align: AlignmentType.CENTER }),
      cell('Ngày Nộp', { bold: true }),
    ],
  });

  const dataRows = attempts.map(
    (a, idx) =>
      new TableRow({
        children: [
          cell(String(idx + 1), { align: AlignmentType.CENTER }),
          cell(a.userName),
          cell(toScore10(a), { align: AlignmentType.CENTER }),
          cell(`${a.score}/${a.maxScore} (${a.percentage}%)`, { align: AlignmentType.CENTER }),
          cell(a.passed ? 'ĐẠT' : 'CHƯA ĐẠT', { align: AlignmentType.CENTER }),
          cell(formatDate(a.completedAt)),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: examTitle, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `${attempts.length} thí sinh đã làm bài`, italics: true, color: '475569' })],
            spacing: { after: 200 },
          }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
