import React, { useState } from 'react';
import { X, Download, Loader2, FileType } from 'lucide-react';
import { ExamAttempt } from '../types';
import { buildAttemptsHtml, generateAttemptsPdfBlob, generateAttemptsWordBlob } from '../services/attemptsPdf';

interface AttemptsPreviewModalProps {
  examTitle: string;
  attempts: ExamAttempt[];
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

export const AttemptsPreviewModal: React.FC<AttemptsPreviewModalProps> = ({ examTitle, attempts, onClose }) => {
  const [downloading, setDownloading] = useState<'word' | 'pdf' | null>(null);

  const handleDownloadWord = async () => {
    setDownloading('word');
    try {
      const blob = await generateAttemptsWordBlob(examTitle, attempts);
      downloadBlob(blob, `Danh sach thi sinh - ${examTitle}.docx`);
    } catch (err) {
      console.error('Không thể tạo tệp Word:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading('pdf');
    try {
      const blob = await generateAttemptsPdfBlob(examTitle, attempts);
      downloadBlob(blob, `Danh sach thi sinh - ${examTitle}.pdf`);
    } catch (err) {
      console.error('Không thể tạo tệp PDF:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-blue-500/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-emerald-500/40 rounded-full blur-3xl" />

      <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-2xl w-full max-w-4xl h-[96vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/20 bg-white/5 flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-base font-bold text-white line-clamp-1">Danh sách thí sinh — {examTitle}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadWord}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-100 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-300/30 disabled:opacity-50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
            >
              {downloading === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />}
              <span>Tải Word</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-100 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/30 disabled:opacity-50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
            >
              {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Tải PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            className="max-w-3xl mx-auto bg-white shadow-xl p-8 sm:p-10 my-6 rounded-lg text-sm sm:text-base text-slate-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: buildAttemptsHtml(examTitle, attempts) }}
          />
        </div>
      </div>
    </div>
  );
};
