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

const GRADE_ICONS = [Clock, Award, PenLine, Ruler, Cloud, Gift, Sun, User, Trophy, Globe, Monitor, Calendar];

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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {GRADE_ICONS.map((Icon, idx) => {
                  const g = idx + 1;
                  const isActive = gradeFilter === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setGradeFilter(isActive ? null : g)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-cyan-600'}`} />
                      <span>Đề thi lớp {g}</span>
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
