import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import {
  Home,
  ChevronRight,
  FileText,
  Clock,
  Award,
  PenLine,
  Ruler,
  Cloud,
  Gift,
  Sun,
  User,
  Trophy,
  Globe,
  Monitor,
  Calendar,
  Flame,
  DownloadCloud,
  GraduationCap,
  UploadCloud,
  X,
  Download,
  Eye,
  Loader2,
} from 'lucide-react';
import { Article, ExamDocument } from '../types';
import { storageService } from '../services/storageService';
import { OfflineLibrary } from './OfflineLibrary';

interface ExamLibraryProps {
  onSelectArticle: (article: Article) => void;
  isOffline: boolean;
  onRefreshSavedCount: () => void;
  refreshKey?: number;
  globalSearchQuery?: string;
}

// Ignore spacing differences ("2024 - 2025" vs "2024-2025") so the global search bar
// still matches a school year regardless of how the user typed the dash.
const normalizeForSearch = (s: string) => s.toLowerCase().replace(/\s+/g, '');

const GRADE_THEMES = [
  { icon: Clock, from: 'from-sky-400', to: 'to-blue-600' },
  { icon: Award, from: 'from-violet-400', to: 'to-purple-600' },
  { icon: PenLine, from: 'from-pink-400', to: 'to-rose-600' },
  { icon: Ruler, from: 'from-orange-400', to: 'to-amber-600' },
  { icon: Cloud, from: 'from-teal-400', to: 'to-emerald-600' },
  { icon: Gift, from: 'from-red-400', to: 'to-rose-600' },
  { icon: Sun, from: 'from-yellow-400', to: 'to-orange-500' },
  { icon: User, from: 'from-indigo-400', to: 'to-indigo-600' },
  { icon: Trophy, from: 'from-amber-400', to: 'to-yellow-600' },
  { icon: Globe, from: 'from-cyan-400', to: 'to-sky-600' },
  { icon: Monitor, from: 'from-fuchsia-400', to: 'to-pink-600' },
  { icon: Calendar, from: 'from-lime-400', to: 'to-green-600' },
];

// --- Upload modal: attach a real .docx/.pdf file, optionally tagged to a grade/semester ---
interface UploadModalProps {
  defaultGrade: number | null;
  onClose: () => void;
  onUploaded: () => void;
}

const UploadExamFileModal: React.FC<UploadModalProps> = ({ defaultGrade, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(defaultGrade ? String(defaultGrade) : '');
  const [semester, setSemester] = useState('Học kỳ 1');
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
      setErrorMsg('Vui lòng nhập tên đề thi.');
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const { fileUrl, fileName, fileType } = await storageService.uploadExamFile(file);
      await storageService.saveExamDocument({
        id: `doc-${Date.now()}`,
        title: title.trim(),
        grade: grade ? Number(grade) : undefined,
        semester: semester || undefined,
        fileUrl,
        fileName,
        fileType,
        views: 0,
        uploadedAt: new Date().toISOString(),
      });
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error('Không tải lên được tệp đề thi:', err);
      setErrorMsg('Không thể tải lên tệp. Vui lòng thử lại.');
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
            <span>Tải Lên Đề Thi</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-6 cursor-pointer transition-colors text-center"
        >
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
          <label className="block text-xs font-medium text-slate-300 mb-1">Tên Đề Thi</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Đề kiểm tra HK1 - Lớp 6"
            className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Khối Lớp</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Không chọn</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Lớp {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Học Kỳ</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="Giữa kỳ">Giữa kỳ</option>
              <option value="Học kỳ 1">Học kỳ 1</option>
              <option value="Học kỳ 2">Học kỳ 2</option>
            </select>
          </div>
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

// --- Viewer modal: renders the actual .docx (via mammoth) or .pdf (native iframe) content ---
interface ViewerModalProps {
  doc: ExamDocument;
  onClose: () => void;
}

export const ExamDocumentViewerModal: React.FC<ViewerModalProps> = ({ doc, onClose }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(doc.fileType === 'docx');

  useEffect(() => {
    storageService.incrementExamDocumentViews(doc.id).catch(() => {});

    if (doc.fileType !== 'docx') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(doc.fileUrl);
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch (err) {
        console.error('Không đọc được nội dung tệp .docx:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.fileUrl, doc.fileType]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{doc.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={doc.fileUrl}
              download={doc.fileName}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống</span>
            </a>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100">
          {doc.fileType === 'pdf' ? (
            <iframe src={`${doc.fileUrl}#zoom=page-width`} title={doc.title} className="w-full h-full border-0" />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải nội dung tài liệu...</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 text-sm p-6 text-center">
              <span>Không thể hiển thị trước nội dung tệp này. Vui lòng tải xuống để xem.</span>
            </div>
          ) : (
            <div
              className="docx-preview max-w-3xl mx-auto bg-white shadow-md p-8 sm:p-10 my-6 rounded-lg text-sm sm:text-base text-slate-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html || '' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const ExamLibrary: React.FC<ExamLibraryProps> = ({
  onSelectArticle,
  isOffline,
  onRefreshSavedCount,
  refreshKey,
  globalSearchQuery,
}) => {
  const [view, setView] = useState<'exams' | 'offline-articles'>('exams');
  const [docs, setDocs] = useState<ExamDocument[]>([]);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ExamDocument | null>(null);

  const loadDocs = () => {
    storageService.getExamDocuments().then(setDocs).catch((err) => console.error('Không tải được kho đề thi:', err));
  };

  useEffect(() => {
    loadDocs();
  }, [refreshKey]);

  const searchTerm = normalizeForSearch(globalSearchQuery || '');
  const newestDocs = [...docs]
    .filter((d) => (gradeFilter ? d.grade === gradeFilter : true))
    .filter((d) => {
      if (!searchTerm) return true;
      const haystack = normalizeForSearch(
        [d.title, d.schoolYear, d.className, d.grade && `khối ${d.grade}`].filter(Boolean).join(' ')
      );
      return haystack.includes(searchTerm);
    })
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const mostViewed = [...docs].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div id="exam-library-view" className="max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <Home className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
        <ChevronRight className="w-3 h-3" />
        <span>Học tập</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-200 font-semibold">Đề thi, đề kiểm tra</span>
      </div>

      {/* View switcher: exam bank vs. the legacy offline-articles cache */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
          <button
            onClick={() => setView('exams')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              view === 'exams' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Đề thi, đề kiểm tra</span>
          </button>
          <button
            onClick={() => setView('offline-articles')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              view === 'offline-articles' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Bài viết đã lưu Offline</span>
          </button>
        </div>

        {view === 'exams' && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tải Lên Đề Thi</span>
          </button>
        )}
      </div>

      {view === 'offline-articles' ? (
        <OfflineLibrary
          isOffline={isOffline}
          onSelectArticle={onSelectArticle}
          onRefreshSavedCount={onRefreshSavedCount}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Main column */}
          <div className="space-y-6 min-w-0">
            {/* Featured grade grid */}
            <div className="glass-panel p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-extrabold text-white mb-4">
                Đề thi, đề kiểm tra nổi bật
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {GRADE_THEMES.map((theme, idx) => {
                  const g = idx + 1;
                  const isActive = gradeFilter === g;
                  const Icon = theme.icon;
                  return (
                    <button
                      key={g}
                      onClick={() => setGradeFilter(isActive ? null : g)}
                      className={`group flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/15 shadow-md'
                          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 hover:shadow-md'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-[11px] sm:text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                        Lớp {g}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Newest exam files list */}
            <div className="glass-panel p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Đề thi, đề kiểm tra mới nhất
                  {gradeFilter && <span className="text-cyan-300"> — Lớp {gradeFilter}</span>}
                </h2>
                {gradeFilter && (
                  <button
                    onClick={() => setGradeFilter(null)}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {newestDocs.length === 0 ? (
                <p className="text-xs text-slate-300 py-6 text-center">
                  {searchTerm
                    ? `Không tìm thấy tài liệu nào khớp với "${globalSearchQuery}".`
                    : gradeFilter
                    ? `Chưa có đề thi nào cho Lớp ${gradeFilter}.`
                    : 'Chưa có đề thi nào được tải lên.'}
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {newestDocs.map((doc) => (
                    <li key={doc.id}>
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="w-full flex items-center gap-3 py-2.5 text-left group"
                      >
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="flex-1 text-xs sm:text-sm text-slate-200 group-hover:text-cyan-300 group-hover:underline line-clamp-1">
                          {doc.title}
                        </span>
                        {doc.grade && (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">Lớp {doc.grade}</span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="glass-panel p-5">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 mb-3">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Đề thi được xem nhiều trong tuần</span>
              </h3>

              {mostViewed.length === 0 ? (
                <p className="text-xs text-slate-300">Chưa có dữ liệu.</p>
              ) : (
                <ol className="space-y-3">
                  {mostViewed.map((doc, idx) => (
                    <li key={doc.id}>
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="w-full flex items-start gap-2.5 text-left group"
                      >
                        <span className="text-xs font-bold text-slate-500 group-hover:text-cyan-300 shrink-0 pt-0.5">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="flex-1 text-xs text-slate-200 group-hover:text-cyan-300 group-hover:underline line-clamp-2">
                          {doc.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <UploadExamFileModal
          defaultGrade={gradeFilter}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={loadDocs}
        />
      )}

      {viewingDoc && (
        <ExamDocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  );
};
