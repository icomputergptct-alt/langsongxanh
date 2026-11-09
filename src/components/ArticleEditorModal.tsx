import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Newspaper, ImagePlus } from 'lucide-react';
import { Article, TechCategory } from '../types';
import { storageService } from '../services/storageService';

interface ArticleEditorModalProps {
  isOpen: boolean;
  article: Article | null; // null = creating a new article
  defaultCategory?: TechCategory; // category preselected when creating a new article
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
  'Tin công nghệ mới',
  'Tin tức địa phương',
];

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'TITLE', 'HEAD', 'LINK', 'NOSCRIPT']);
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'TABLE', 'TR', 'FIGURE', 'FIGCAPTION',
  'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'HR',
]);

// News sites lazy-load images: `src` holds a tiny placeholder (often a
// data:image/gif 1x1) and the real photo URL sits in a data-* attribute or
// srcset until the image scrolls into view. Prefer those real URLs.
const LAZY_SRC_ATTRS = ['data-src', 'data-original', 'data-lazy-src', 'data-lazy', 'data-url', 'data-full-src'];
const LAZY_SRCSET_ATTRS = ['data-srcset', 'data-lazy-srcset', 'srcset'];
const PLACEHOLDER_MAX_BYTES = 200;

function toAbsoluteUrl(url: string): string {
  const u = url.trim();
  return u.startsWith('//') ? `https:${u}` : u;
}

// Largest candidate of a srcset ("a.jpg 320w, b.jpg 1024w" -> b.jpg).
function pickFromSrcset(srcset: string): string {
  let best = '';
  let bestScore = -1;
  for (const part of srcset.split(',')) {
    const [url, descriptor = ''] = part.trim().split(/\s+/);
    if (!url) continue;
    const score = parseFloat(descriptor) || 0;
    if (score >= bestScore) {
      best = url;
      bestScore = score;
    }
  }
  return best;
}

function pickImageSource(img: HTMLImageElement): string {
  const isRemote = (u: string) => /^(https?:)?\/\//i.test(u);
  for (const attr of LAZY_SRC_ATTRS) {
    const v = toAbsoluteUrl(img.getAttribute(attr) || '');
    if (isRemote(v)) return v;
  }
  for (const attr of LAZY_SRCSET_ATTRS) {
    const v = toAbsoluteUrl(pickFromSrcset(img.getAttribute(attr) || ''));
    if (isRemote(v)) return v;
  }
  return toAbsoluteUrl(img.getAttribute('src') || '');
}

// Converts pasted HTML (from a web page, Word, Google Docs...) into the article's
// markdown-like format. Embedded data: images are uploaded; http(s) images keep
// their URL; anything else (e.g. Word's local file:/// images) can't be read and is skipped.
async function htmlToArticleContent(
  html: string,
  uploadImage: (blob: Blob) => Promise<string>
): Promise<{ text: string; imageUrls: string[]; skippedImages: number }> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: string[] = [];
  const imageUrls: string[] = [];
  let skippedImages = 0;
  let line = '';

  const takeLine = () => {
    const t = line.replace(/\s+/g, ' ').replace(/\*\*\s*\*\*/g, '').trim();
    line = '';
    return t;
  };
  const flush = () => {
    const t = takeLine();
    if (t) blocks.push(t);
  };

  const resolveImage = async (img: HTMLImageElement) => {
    const src = pickImageSource(img);
    try {
      if (src.startsWith('data:image/')) {
        const blob = await (await fetch(src)).blob();
        // A few-dozen-byte data: image is a lazy-load placeholder (usually a
        // transparent 1x1 GIF), not real content — don't upload it as a photo.
        if (blob.size < PLACEHOLDER_MAX_BYTES) return null;
        return await uploadImage(blob);
      }
      if (/^https?:\/\//i.test(src)) return src;
    } catch (err) {
      console.error('Không tải được ảnh dán vào:', err);
    }
    return null;
  };

  const walk = async (node: Node): Promise<void> => {
    if (node.nodeType === Node.TEXT_NODE) {
      line += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (SKIPPED_TAGS.has(tag)) return;

    if (tag === 'IMG') {
      flush();
      const url = await resolveImage(el as HTMLImageElement);
      if (url) {
        const alt = (el.getAttribute('alt') || '').replace(/[\[\]\n]/g, ' ').trim();
        blocks.push(`![${alt}](${url})`);
        imageUrls.push(url);
      } else {
        skippedImages++;
      }
      return;
    }
    if (tag === 'BR') {
      line += ' ';
      return;
    }
    if (/^H[1-6]$/.test(tag)) {
      flush();
      for (const child of Array.from(el.childNodes)) await walk(child);
      const t = takeLine().replace(/\*\*/g, '');
      if (t) blocks.push(`### ${t}`);
      return;
    }
    if (tag === 'STRONG' || tag === 'B') {
      line += '**';
      for (const child of Array.from(el.childNodes)) await walk(child);
      line += '**';
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      flush();
      const items: string[] = [];
      for (const li of Array.from(el.children)) {
        for (const child of Array.from(li.childNodes)) await walk(child);
        const t = takeLine();
        if (t) items.push(tag === 'OL' ? `${items.length + 1}. ${t}` : `* ${t}`);
      }
      if (items.length) blocks.push(items.join('\n'));
      return;
    }
    if (tag === 'PRE') {
      flush();
      blocks.push('```\n' + (el.textContent || '').replace(/\n+$/, '') + '\n```');
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) flush();
    for (const child of Array.from(el.childNodes)) await walk(child);
    if (isBlock) flush();
  };

  await walk(doc.body);
  flush();
  return { text: blocks.join('\n\n'), imageUrls, skippedImages };
}

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

export const ArticleEditorModal: React.FC<ArticleEditorModalProps> = ({ isOpen, article, defaultCategory, onClose, onSaved }) => {
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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      setCategory(defaultCategory || 'Trí tuệ Nhân tạo');
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
    setImageNotice(null);
  }, [isOpen, article, defaultCategory]);

  if (!isOpen) return null;

  // Inserts a block at the textarea's cursor (replacing any selection), padded with
  // blank lines so it stays its own paragraph in the rendered article.
  const insertAtCursor = (text: string, start: number, end: number) => {
    setContent((prev) => {
      const before = prev.slice(0, start).replace(/\s+$/, '');
      const after = prev.slice(end).replace(/^\s+/, '');
      return [before, text, after].filter(Boolean).join('\n\n');
    });
  };

  // Every image embedded in the content (![alt](url)), in order, without duplicates.
  const contentImages = Array.from(new Set(Array.from(content.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g), (m) => m[1])));

  const removeContentImage = (url: string) => {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    setContent((prev) =>
      prev
        .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
    if (coverImage === url) setCoverImage(contentImages.find((u) => u !== url) || '');
  };

  const fillCoverIfEmpty = (urls: string[]) => {
    if (urls.length) setCoverImage((prev) => prev || urls[0]);
  };

  const uploadImageFiles = async (files: File[], start: number, end: number) => {
    setIsUploadingImages(true);
    setImageNotice(null);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await storageService.uploadArticleImage(file));
      insertAtCursor(urls.map((u) => `![](${u})`).join('\n\n'), start, end);
      fillCoverIfEmpty(urls);
    } catch (err) {
      console.error('Không tải được ảnh lên:', err);
      setImageNotice('Không tải được ảnh lên Supabase. Vui lòng thử lại.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleContentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const { selectionStart: start, selectionEnd: end } = e.currentTarget;
    const html = e.clipboardData.getData('text/html');
    const imageFiles = Array.from<File>(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));

    // Rich content with images (web page, Word, Google Docs): convert it, images included.
    if (html && /<img[\s>]/i.test(html)) {
      e.preventDefault();
      setIsUploadingImages(true);
      setImageNotice(null);
      try {
        const { text, imageUrls, skippedImages } = await htmlToArticleContent(html, storageService.uploadArticleImage);
        if (imageUrls.length === 0 && imageFiles.length > 0) {
          // e.g. a single image copied from Word: the HTML points at a local file, but the bytes come as a file.
          setIsUploadingImages(false);
          await uploadImageFiles(imageFiles, start, end);
          return;
        }
        insertAtCursor(text, start, end);
        fillCoverIfEmpty(imageUrls);
        if (skippedImages > 0) {
          setImageNotice(
            `Có ${skippedImages} ảnh không đọc được từ nội dung vừa dán (thường gặp khi copy từ Word). Hãy copy riêng từng ảnh rồi dán, hoặc bấm "Chèn ảnh".`
          );
        }
      } catch (err) {
        console.error('Không xử lý được nội dung dán vào:', err);
        setImageNotice('Không xử lý được nội dung vừa dán. Vui lòng thử lại.');
      } finally {
        setIsUploadingImages(false);
      }
      return;
    }

    // A bare image (screenshot, "Copy image").
    if (imageFiles.length > 0) {
      e.preventDefault();
      await uploadImageFiles(imageFiles, start, end);
    }
  };

  const handlePickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from<File>(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length === 0) return;
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    await uploadImageFiles(files, start, end);
  };

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
            <div className="flex items-end justify-between gap-3 mb-1">
              <label className="block text-xs font-medium text-slate-400">
                Nội dung (hỗ trợ ### tiêu đề, ```code```, gạch đầu dòng * ). Có thể dán (Ctrl+V) cả chữ lẫn hình ảnh.
              </label>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImages}
                className="flex items-center gap-1.5 shrink-0 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Chèn ảnh</span>
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handlePickImages} />
            </div>
            <textarea
              ref={contentRef}
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handleContentPaste}
              readOnly={isUploadingImages}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none resize-y"
            />
            {isUploadingImages && <p className="mt-1 text-xs text-cyan-300">Đang tải ảnh lên...</p>}
            {imageNotice && <p className="mt-1 text-xs text-amber-300">{imageNotice}</p>}

            {contentImages.length >= 2 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-400 mb-2">
                  Danh sách hình ảnh trong bài ({contentImages.length}) — bấm vào ảnh để đặt làm ảnh bìa
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {contentImages.map((url, idx) => {
                    const isCover = url === coverImage;
                    return (
                      <div
                        key={url}
                        className={`relative group aspect-square rounded-lg overflow-hidden border-2 bg-slate-950 ${
                          isCover ? 'border-emerald-400' : 'border-slate-800 hover:border-cyan-500'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCoverImage(url)}
                          title="Đặt làm ảnh bìa"
                          className="w-full h-full"
                        >
                          <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                        <span className="absolute top-1 left-1 text-[10px] font-bold bg-black/70 text-white px-1.5 rounded">
                          {idx + 1}
                        </span>
                        {isCover && (
                          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Ảnh bìa
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeContentImage(url)}
                          disabled={isUploadingImages}
                          title="Xoá ảnh khỏi bài viết"
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white opacity-80 group-hover:opacity-100 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            disabled={isSaving || isUploadingImages}
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
