import React, { useState } from 'react';
import { X, Download, Loader2, FileType, Printer } from 'lucide-react';
import { ExamAttempt, QuizExam } from '../types';
import { buildAttemptsHtml, generateAttemptsPdfBlob, generateAttemptsWordBlob } from '../services/attemptsPdf';

interface AttemptsPreviewModalProps {
  exam: QuizExam;
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

export const AttemptsPreviewModal: React.FC<AttemptsPreviewModalProps> = ({ exam, attempts, onClose }) => {
  const [busy, setBusy] = useState<'word' | 'pdf' | 'print' | null>(null);

  const handleDownloadWord = async () => {
    setBusy('word');
    try {
      const blob = await generateAttemptsWordBlob(exam, attempts);
      downloadBlob(blob, `Danh sach thi sinh - ${exam.title}.docx`);
    } catch (err) {
      console.error('Không thể tạo tệp Word:', err);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = async () => {
    setBusy('pdf');
    try {
      const blob = await generateAttemptsPdfBlob(exam, attempts);
      downloadBlob(blob, `Danh sach thi sinh - ${exam.title}.pdf`);
    } catch (err) {
      console.error('Không thể tạo tệp PDF:', err);
    } finally {
      setBusy(null);
    }
  };

  // Generates the same PDF as "Tải PDF" and prints THAT (in a hidden iframe, no
  // popup so browsers don't block it) instead of the live modal DOM — a real
  // browser print of the on-screen glass modal never matches the actual PDF
  // layout/pagination, so this guarantees what gets printed is exactly what a
  // teacher would get from downloading the PDF, just skipping the save step.
  const handlePrint = async () => {
    setBusy('print');
    try {
      const blob = await generateAttemptsPdfBlob(exam, attempts);
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
      document.body.appendChild(iframe);
      // Leave the iframe (and its blob URL) around long enough for the OS print
      // dialog to actually finish, then clean up.
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error('Không thể tạo tệp PDF để in:', err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-blue-500/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-emerald-500/40 rounded-full blur-3xl" />

      <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-2xl w-full max-w-4xl h-[96vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/20 bg-white/5 flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-base font-bold text-white line-clamp-1">Danh sách thí sinh — {exam.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={busy !== null}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 disabled:opacity-50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
            >
              {busy === 'print' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>In DSHS</span>
            </button>
            <button
              onClick={handleDownloadWord}
              disabled={busy !== null}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-100 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-300/30 disabled:opacity-50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
            >
              {busy === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />}
              <span>Tải Word</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={busy !== null}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-100 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/30 disabled:opacity-50 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
            >
              {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
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
            dangerouslySetInnerHTML={{ __html: buildAttemptsHtml(exam, attempts) }}
          />
        </div>
      </div>
    </div>
  );
};
