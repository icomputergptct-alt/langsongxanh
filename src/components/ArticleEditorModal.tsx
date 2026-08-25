import React, { useEffect, useState } from 'react';
import { X, Check, Newspaper } from 'lucide-react';
import { Article, TechCategory } from '../types';
import { storageService } from '../services/storageService';

interface ArticleEditorModalProps {
  isOpen: boolean;
  article: Article | null; // null = creating a new article
  onClose: () => void;
  onSaved: (article: Article) => void;
}

const CATEGORIES: TechCategory[] = [
  'Trí tuệ Nhân tạo',
  'An ninh Mạng',
  'Điện toán Đám mây & DevOps',
  'Kiến trúc Phần mềm',
  'Blockchain & Web3',
  'Phần cứng & Bán dẫn',
];

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ArticleEditorModal: React.FC<ArticleEditorModalProps> = ({ isOpen, article, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TechCategory>('Trí tuệ Nhân tạo');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(5);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [authorAvatar, setAuthorAvatar] = useState(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  );
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [keyInsights, setKeyInsights] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (article) {
      setTitle(article.title);
      setSlug(article.slug);
      setSummary(article.summary);
      setContent(article.content);
      setCategory(article.category);
      setTags(article.tags.join(', '));
      setCoverImage(article.coverImage);
      setReadTimeMinutes(article.readTimeMinutes);
      setAuthorName(article.author.name);
      setAuthorRole(article.author.role);
      setAuthorAvatar(article.author.avatar);
      setIsDeepAnalysis(!!article.isDeepAnalysis);
      setIsTrending(!!article.isTrending);
      setKeyInsights((article.keyInsights || []).join('\n'));
    } else {
      setTitle('');
      setSlug('');
      setSummary('');
      setContent('');
      setCategory('Trí tuệ Nhân tạo');
      setTags('');
      setCoverImage('');
      setReadTimeMinutes(5);
      setAuthorName('');
      setAuthorRole('');
      setIsDeepAnalysis(false);
      setIsTrending(false);
      setKeyInsights('');
    }
    setError(null);
  }, [isOpen, article]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim() || !summary.trim() || !content.trim() || !coverImage.trim() || !authorName.trim()) {
      setError('Vui lòng điền đầy đủ: tiêu đề, tóm tắt, nội dung, ảnh bìa và tên tác giả.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const finalSlug = slug.trim() || slugify(title);
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const insightList = keyInsights.split('\n').map((t) => t.trim()).filter(Boolean);

    const payload: Article = article
      ? {
          ...article,
          title: title.trim(),
          slug: finalSlug,
          summary: summary.trim(),
          content: content.trim(),
          category,
          tags: tagList,
          coverImage: coverImage.trim(),
          readTimeMinutes: Number(readTimeMinutes) || 5,
          author: { ...article.author, name: authorName.trim(), role: authorRole.trim(), avatar: authorAvatar.trim() },
          isDeepAnalysis,
          isTrending,
          keyInsights: insightList,
        }
      : {
          id: `art-${Date.now()}`,
          title: title.trim(),
          slug: finalSlug,
          summary: summary.trim(),
          content: content.trim(),
          author: {
            name: authorName.trim(),
            role: authorRole.trim() || 'Biên tập viên',
            avatar: authorAvatar.trim(),
            verified: true,
          },
          publishedAt: new Date().toISOString(),
          readTimeMinutes: Number(readTimeMinutes) || 5,
          category,
          tags: tagList,
          coverImage: coverImage.trim(),
          views: 0,
          likes: 0,
          isDeepAnalysis,
          isTrending,
          keyInsights: insightList,
        };

    try {
      if (article) {
        await storageService.updateArticle(payload);
      } else {
        await storageService.createArticle(payload);
      }
      onSaved(payload);
      onClose();
    } catch (err) {
      console.error('Không lưu được bài viết:', err);
      setError('Không thể lưu bài viết lên Supabase. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Newspaper className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">{article ? 'Chỉnh Sửa Bài Viết' : 'Thêm Bài Viết Mới'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug (để trống sẽ tự tạo)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={title ? slugify(title) : 'duong-dan-bai-viet'}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TechCategory)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tóm tắt ngắn</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-sm text-slate-200 focus:outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nội dung (hỗ trợ ### tiêu đề, ```code```, gạch đầu dòng * )</label>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ảnh bìa (URL)</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Thẻ (cách nhau bởi dấu phẩy)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="AI, LLM, Kiến trúc"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tên tác giả</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Chức danh tác giả</label>
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Thời gian đọc (phút)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={readTimeMinutes}
                onChange={(e) => setReadTimeMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Điểm nhấn chính (mỗi dòng một ý, không bắt buộc)</label>
            <textarea
              rows={3}
              value={keyInsights}
              onChange={(e) => setKeyInsights(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-sm text-slate-200 focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={isDeepAnalysis} onChange={(e) => setIsDeepAnalysis(e.target.checked)} className="accent-cyan-500" />
              Phân tích chuyên sâu
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} className="accent-cyan-500" />
              Đánh dấu thịnh hành
            </label>
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-4 py-2">
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : article ? 'Lưu thay đổi' : 'Đăng bài viết'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
