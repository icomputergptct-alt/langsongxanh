import React, { useEffect, useState } from 'react';
import { Search, FileText, GraduationCap, BookOpen } from 'lucide-react';
import { Article, ExamDocument, QuizExam } from '../types';
import { storageService } from '../services/storageService';

interface SearchResultsProps {
  query: string;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onOpenExam: (exam: QuizExam) => void;
  onOpenDocument: (doc: ExamDocument) => void;
}

// Ignore spacing differences ("2024 - 2025" vs "2024-2025") so a school year
// still matches regardless of how the user typed the dash.
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export const SearchResults: React.FC<SearchResultsProps> = ({ query, articles, onSelectArticle, onOpenExam, onOpenDocument }) => {
  const [exams, setExams] = useState<QuizExam[]>([]);
  const [docs, setDocs] = useState<ExamDocument[]>([]);

  useEffect(() => {
    storageService.getExams().then(setExams).catch((err) => console.error('Không tải được đề thi:', err));
    storageService.getExamDocuments().then(setDocs).catch((err) => console.error('Không tải được tài liệu:', err));
  }, []);

  const term = normalize(query);

  const matchedArticles = articles.filter((a) =>
    normalize([a.title, a.summary, a.category, ...(a.tags || [])].join(' ')).includes(term)
  );

  const matchedExams = exams.filter((ex) =>
    normalize(
      [ex.title, ex.description, ex.schoolYear, ex.schoolName, ex.className, ex.grade && `khối ${ex.grade}`]
        .filter(Boolean)
        .join(' ')
    ).includes(term)
  );

  const matchedDocs = docs.filter((d) =>
    normalize([d.title, d.schoolYear, d.className, d.grade && `khối ${d.grade}`].filter(Boolean).join(' ')).includes(term)
  );

  const totalCount = matchedArticles.length + matchedExams.length + matchedDocs.length;

  return (
    <div id="global-search-results" className="space-y-8 pb-16">
      <div className="flex items-center gap-2 text-slate-300">
        <Search className="w-4 h-4" />
        <span className="text-sm">
          Kết quả tìm kiếm cho <strong className="text-white">"{query}"</strong> — {totalCount} kết quả
        </span>
      </div>

      {totalCount === 0 && (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">Không tìm thấy kết quả phù hợp</h3>
          <p className="text-xs text-slate-500">Thử từ khóa khác hoặc kiểm tra lại chính tả.</p>
        </div>
      )}

      {matchedArticles.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Bài viết ({matchedArticles.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedArticles.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectArticle(a)}
                className="text-left bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-4 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase text-blue-400">{a.category}</span>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-2 mt-1">{a.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{a.summary}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {matchedExams.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span>Đề thi ({matchedExams.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedExams.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onOpenExam(ex)}
                className="text-left bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase text-cyan-400">{ex.category}</span>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-2 mt-1">{ex.title}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {[ex.schoolYear, ex.className && `Lớp ${ex.className}`, ex.grade && `Khối ${ex.grade}`]
                    .filter(Boolean)
                    .join(' · ') || 'Chưa gắn thông tin lớp/năm học'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {matchedDocs.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Tài liệu ({matchedDocs.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => onOpenDocument(d)}
                className="text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 transition-colors"
              >
                <h4 className="text-sm font-bold text-slate-100 line-clamp-2">{d.title}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {[d.schoolYear, d.className && `Lớp ${d.className}`, d.grade && `Khối ${d.grade}`]
                    .filter(Boolean)
                    .join(' · ') || 'Chưa gắn thông tin lớp/năm học'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
