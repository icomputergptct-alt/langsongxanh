import React, { useEffect, useState } from 'react';
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
  Lock,
  Flame,
  DownloadCloud,
  GraduationCap,
} from 'lucide-react';
import { Article, QuizExam } from '../types';
import { storageService } from '../services/storageService';
import { OfflineLibrary } from './OfflineLibrary';

interface ExamLibraryProps {
  examsRefreshKey?: number;
  onOpenExam: (examId: string) => void;
  onSelectArticle: (article: Article) => void;
  isOffline: boolean;
  onRefreshSavedCount: () => void;
}

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

export const ExamLibrary: React.FC<ExamLibraryProps> = ({
  examsRefreshKey,
  onOpenExam,
  onSelectArticle,
  isOffline,
  onRefreshSavedCount,
}) => {
  const [view, setView] = useState<'exams' | 'offline-articles'>('exams');
  const [exams, setExams] = useState<QuizExam[]>([]);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);

  useEffect(() => {
    storageService.getExams().then(setExams).catch((err) => console.error('Không tải được đề thi:', err));
  }, [examsRefreshKey]);

  const newestExams = [...exams]
    .filter((e) => (gradeFilter ? e.grade === gradeFilter : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const mostPopular = [...exams]
    .sort((a, b) => b.participantsCount - a.participantsCount)
    .slice(0, 5);

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
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md mb-6">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mb-4">
                Đề thi, đề kiểm tra nổi bật
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {GRADE_THEMES.map((theme, idx) => {
                  const g = idx + 1;
                  const isActive = gradeFilter === g;
                  const Icon = theme.icon;
                  return (
                    <button
                      key={g}
                      onClick={() => setGradeFilter(isActive ? null : g)}
                      className={`group flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-50 shadow-md'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                      </div>
                      <span className={`text-xs sm:text-sm font-bold ${isActive ? 'text-cyan-700' : 'text-slate-700'}`}>
                        Đề thi lớp {g}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Newest exams list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Đề thi, đề kiểm tra mới nhất
                  {gradeFilter && <span className="text-cyan-600"> — Lớp {gradeFilter}</span>}
                </h2>
                {gradeFilter && (
                  <button
                    onClick={() => setGradeFilter(null)}
                    className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {newestExams.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  {gradeFilter ? `Chưa có đề thi nào cho Lớp ${gradeFilter}.` : 'Chưa có đề thi nào được phát hành.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {newestExams.map((exam) => (
                    <li key={exam.id}>
                      <button
                        onClick={() => onOpenExam(exam.id)}
                        className="w-full flex items-center gap-3 py-2.5 text-left group"
                      >
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="flex-1 text-xs sm:text-sm text-slate-700 group-hover:text-cyan-600 group-hover:underline line-clamp-1">
                          {exam.title}
                        </span>
                        {exam.grade && (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">Lớp {exam.grade}</span>
                        )}
                        {exam.roomPassword && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mb-3">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Đề thi được quan tâm trong tuần</span>
              </h3>

              {mostPopular.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có dữ liệu.</p>
              ) : (
                <ol className="space-y-3">
                  {mostPopular.map((exam, idx) => (
                    <li key={exam.id}>
                      <button
                        onClick={() => onOpenExam(exam.id)}
                        className="w-full flex items-start gap-2.5 text-left group"
                      >
                        <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-600 shrink-0 pt-0.5">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="flex-1 text-xs text-slate-700 group-hover:text-cyan-600 group-hover:underline line-clamp-2">
                          {exam.title}
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
    </div>
  );
};
