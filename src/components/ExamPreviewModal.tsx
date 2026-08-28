import React, { useState } from 'react';
import { X, Download, Loader2, FileType } from 'lucide-react';
import { QuizExam } from '../types';
import { buildExamHtml, generateExamPdfBlob, generateExamWordBlob } from '../services/examPdf';

interface ExamPreviewModalProps {
  exam: QuizExam;
  onClose: () => void;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ExamPreviewModal: React.FC<ExamPreviewModalProps> = ({ exam, onClose }) => {
  const [downloading, setDownloading] = useState<'word' | 'pdf' | null>(null);

  const handleDownloadWord = () => {
    setDownloading('word');
    try {
      downloadBlob(generateExamWordBlob(exam), `${exam.title}.doc`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading('pdf');
    try {
      const blob = await generateExamPdfBlob(exam);
      downloadBlob(blob, `${exam.title}.pdf`);
    } catch (err) {
      console.error('Không thể tạo tệp PDF:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{exam.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadWord}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {downloading === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />}
              <span>Tải Word</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Tải PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div
            className="max-w-3xl mx-auto bg-white shadow-md p-8 sm:p-10 my-6 rounded-lg text-sm sm:text-base text-slate-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: buildExamHtml(exam) }}
          />
        </div>
      </div>
    </div>
  );
};
