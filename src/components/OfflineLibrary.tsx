import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Trash2, 
  BookOpen, 
  HardDrive, 
  WifiOff, 
  Clock, 
  FileText, 
  CheckCircle, 
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Article, OfflineArticle } from '../types';
import { storageService } from '../services/storageService';

interface OfflineLibraryProps {
  onSelectArticle: (article: Article) => void;
  isOffline: boolean;
  onRefreshSavedCount: () => void;
}

export const OfflineLibrary: React.FC<OfflineLibraryProps> = ({
  onSelectArticle,
  isOffline,
  onRefreshSavedCount,
}) => {
  const [offlineArticles, setOfflineArticles] = useState<OfflineArticle[]>(() =>
    storageService.getOfflineArticles()
  );
  const [searchFilter, setSearchFilter] = useState('');

  const handleRemove = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.removeArticleOffline(articleId);
    const updated = storageService.getOfflineArticles();
    setOfflineArticles(updated);
    onRefreshSavedCount();
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bài viết trong kho ngoại tuyến?')) {
      storageService.clearAllOfflineArticles();
      setOfflineArticles([]);
      onRefreshSavedCount();
    }
  };

  const totalSizeKB = offlineArticles.reduce((acc, item) => acc + (item.sizeKB || 1), 0);
  const filteredArticles = offlineArticles.filter((item) =>
    item.article.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.article.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div id="offline-library-view" className="max-w-6xl mx-auto pb-16">
      
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                Kho Lưu Trữ & Đọc Ngoại Tuyến (Offline Vault)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Các bài viết phân tích kỹ thuật đã được đóng gói và lưu hoàn chỉnh vào bộ nhớ trình duyệt (Local Cache). Bạn có thể truy cập, đọc và nghiên cứu tài liệu mọi lúc ngay cả khi không có kết nối mạng Internet.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Tổng bài đã lưu</span>
              <span className="text-xl font-bold text-cyan-400">{offlineArticles.length} bài</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Dung lượng chiếm dụng</span>
              <span className="text-xl font-bold text-slate-200">
                {totalSizeKB > 1024 ? `${(totalSizeKB / 1024).toFixed(1)} MB` : `${totalSizeKB} KB`}
              </span>
            </div>
          </div>

        </div>

        {/* Offline Status indicator */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-slate-300 font-medium">
              Trạng thái mạng hiện tại: <strong className={isOffline ? 'text-amber-400' : 'text-emerald-400'}>{isOffline ? 'Ngoại tuyến (Offline)' : 'Trực tuyến (Online)'}</strong>
            </span>
          </div>

          {offlineArticles.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ kho offline</span>
            </button>
          )}
        </div>
      </div>

      {/* Search within offline */}
      {offlineArticles.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Lọc bài viết ngoại tuyến theo tiêu đề, danh mục..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">
            Hiển thị {filteredArticles.length} / {offlineArticles.length} bài
          </span>
        </div>
      )}

      {/* Offline Articles Grid */}
      {offlineArticles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <DownloadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-2">
            Chưa có bài viết nào được lưu ngoại tuyến
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Khi duyệt danh sách bài viết hoặc đang đọc một bài phân tích chuyên sâu, hãy nhấn biểu tượng <strong>"Lưu để đọc Offline"</strong> để tải nội dung về đọc mọi lúc không cần Internet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredArticles.map((item) => (
            <div
              key={item.article.id}
              id={`offline-item-${item.article.id}`}
              onClick={() => onSelectArticle(item.article)}
              className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                    {item.article.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    <span>{item.sizeKB} KB</span>
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
                  {item.article.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {item.article.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] text-slate-400">
                  Lưu lúc: {new Date(item.savedAt).toLocaleDateString('vi-VN')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleRemove(item.article.id, e)}
                    title="Xóa khỏi bộ nhớ ngoại tuyến"
                    className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:underline text-[11px]">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Đọc ngay</span>
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
