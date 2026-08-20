import React from 'react';
import { 
  Clock, 
  ThumbsUp, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  TrendingUp, 
  ArrowUpRight
} from 'lucide-react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  isSavedOffline: boolean;
  onSelectArticle: (article: Article) => void;
  onToggleSaveOffline: (article: Article, e: React.MouseEvent) => void;
  onToggleLike: (articleId: string, e: React.MouseEvent) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  isSavedOffline,
  onSelectArticle,
  onToggleSaveOffline,
  onToggleLike,
}) => {
  return (
    <article
      id={`article-card-${article.id}`}
      onClick={() => onSelectArticle(article)}
      className="group relative bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col"
    >
      {/* Cover Image & Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={article.coverImage}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
          <span className="bg-blue-600/90 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
            {article.category}
          </span>
          {article.isDeepAnalysis && (
            <span className="bg-indigo-600/90 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3" />
              <span>Phân tích sâu</span>
            </span>
          )}
          {article.isTrending && (
            <span className="bg-rose-600/90 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 shadow-sm">
              <TrendingUp className="w-3 h-3" />
              <span>Thịnh hành</span>
            </span>
          )}
        </div>

        {/* Save Offline Quick Button */}
        <button
          id={`save-offline-card-btn-${article.id}`}
          onClick={(e) => onToggleSaveOffline(article, e)}
          title={isSavedOffline ? 'Đã lưu đọc ngoại tuyến (Click để xóa)' : 'Lưu vào kho ngoại tuyến'}
          className={`absolute top-3.5 right-3.5 p-2 rounded-xl backdrop-blur-md border transition-all ${
            isSavedOffline
              ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-md shadow-blue-500/30'
              : 'bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border-slate-700/80'
          }`}
        >
          {isSavedOffline ? (
            <BookmarkCheck className="w-4 h-4" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-2 flex items-start justify-between gap-2">
            <span>{article.title}</span>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
          </h3>

          {/* Summary */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {article.summary}
          </p>
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {/* Author */}
          <div className="flex items-center gap-2">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-6 h-6 rounded-full object-cover border border-slate-700"
            />
            <span className="text-slate-300 font-medium truncate max-w-[120px]">
              {article.author.name}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{article.readTimeMinutes}p</span>
            </span>

            <button
              onClick={(e) => onToggleLike(article.id, e)}
              className={`flex items-center gap-1 hover:text-blue-400 transition-colors ${
                article.isLikedByUser ? 'text-blue-400 font-bold' : 'text-slate-400'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{article.likes}</span>
            </button>
          </div>
        </div>

      </div>
    </article>
  );
};
