import React, { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { ExamDocument } from '../types';
import { storageService } from '../services/storageService';

interface DocumentUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFilePick = (f: File | null) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'pdf') {
      setErrorMsg('Chỉ hỗ trợ tệp .docx hoặc .pdf.');
      return;
    }
    setErrorMsg(null);
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Vui lòng chọn tệp .docx hoặc .pdf.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên tài liệu.');
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const { fileUrl, fileName, fileType } = await storageService.uploadExamFile(file);
      const doc: ExamDocument = {
        id: `doc-${Date.now()}`,
        title: title.trim(),
        grade: grade ? Number(grade) : undefined,
        className: className.trim() || undefined,
        schoolYear: schoolYear.trim() || undefined,
        fileUrl,
        fileName,
        fileType,
        views: 0,
        uploadedAt: new Date().toISOString(),
      };
      await storageService.saveExamDocument(doc);
      onUploaded();
      onClose();
    } catch (err) {
      console.error('Không tải lên được tài liệu:', err);
      setErrorMsg('Không thể tải lên tài liệu. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            <span>Tải Lên Tài Liệu</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-6 cursor-pointer transition-colors text-center">
          <UploadCloud className="w-6 h-6 text-slate-500" />
          <span className="text-xs text-slate-300 font-semibold">
            {file ? file.name : 'Chọn tệp .docx hoặc .pdf'}
          </span>
          <input
            type="file"
            accept=".docx,.pdf"
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
          />
        </label>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Tên Tài Liệu</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Tài liệu ôn tập HK1 - Lớp 6"
            className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Khối</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Không chọn</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Lớp</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="VD: 6A1"
              className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Năm Học</label>
          <input
            type="text"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            placeholder="VD: 2025-2026"
            className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        {errorMsg && <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>}

        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl shadow-md transition-all"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          <span>{isUploading ? 'Đang tải lên...' : 'Tải Lên'}</span>
        </button>
      </div>
    </div>
  );
};
