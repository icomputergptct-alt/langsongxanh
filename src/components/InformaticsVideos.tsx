import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, PlayCircle, Plus, Pencil, Trash2, X, Search, ExternalLink, Loader2, Film } from 'lucide-react';
import { VideoItem, VIDEO_CATEGORIES } from '../types';
import { storageService } from '../services/storageService';

const PAGE_SIZE = 12;

// Pull the 11-char video id out of any common YouTube link shape (watch, youtu.be,
// shorts, embed, live), or accept a bare id.
export const parseYouTubeId = (input: string): string | null => {
  const raw = input.trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* not a URL */
  }
  return null;
};

const isHttpUrl = (value: string) => {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isDirectVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

const thumbnailOf = (v: VideoItem) =>
  v.thumbnailUrl || (v.youtubeId ? `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg` : null);

// Best-effort title lookup so the admin only has to paste a link.
async function fetchVideoTitle(url: string): Promise<string | null> {
  const endpoints = [
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data?.title === 'string' && data.title.trim()) return data.title.trim();
    } catch {
      /* try the next one */
    }
  }
  return null;
}

interface Props {
  isAdmin: boolean;
}

export const InformaticsVideos: React.FC<Props> = ({ isAdmin }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Tất cả');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [editing, setEditing] = useState<VideoItem | 'new' | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(false);
    storageService
      .getVideos()
      .then(setVideos)
      .catch((err) => {
        console.error('Không tải được danh sách video:', err);
        setLoadError(true);
      })
      .finally(() => setIsLoading(false));
  };
  useEffect(load, []);

  const categories = useMemo(() => {
    const known: readonly string[] = VIDEO_CATEGORIES;
    const used = Array.from(new Set<string>(videos.map((v) => v.category)));
    return ['Tất cả', ...known.filter((c) => used.includes(c)), ...used.filter((c) => !known.includes(c))];
  }, [videos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (category === 'Tất cả' || v.category === category) &&
        (!q || v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q))
    );
  }, [videos, query, category]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query, category]);

  const openVideo = (v: VideoItem) => {
    if (v.youtubeId || isDirectVideoFile(v.url)) setPlaying(v);
    else window.open(v.url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (v: VideoItem) => {
    if (!window.confirm(`Xoá video "${v.title}"?`)) return;
    try {
      await storageService.deleteVideo(v);
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
    } catch (err) {
      console.error('Không xoá được video:', err);
      alert('Không xoá được video. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-950/60 via-slate-900 to-emerald-950/40 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg shadow-blue-600/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Tin Học</h1>
              <p className="text-xs sm:text-sm text-slate-400">Video hướng dẫn tin học tổng hợp từ YouTube</p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" /> Thêm video
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col md:flex-row gap-3">
          <div className="relative md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm video..."
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                  category === c
                    ? 'bg-blue-600/30 border-blue-400/40 text-white'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Đang tải video...
        </div>
      ) : loadError ? (
        <div className="text-center py-16 text-sm text-slate-400">
          Không tải được danh sách video.{' '}
          <button type="button" onClick={load} className="text-cyan-400 hover:underline">
            Thử lại
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">
          <Film className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          {videos.length === 0 ? 'Chưa có video nào.' : 'Không tìm thấy video phù hợp.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.slice(0, visibleCount).map((v) => {
              const thumb = thumbnailOf(v);
              const playable = !!v.youtubeId || isDirectVideoFile(v.url);
              return (
                <div
                  key={v.id}
                  className="group relative flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/70 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition"
                >
                  <button type="button" onClick={() => openVideo(v)} className="text-left flex flex-col flex-1">
                    <div className="relative aspect-video bg-slate-950">
                      {thumb ? (
                        <img src={thumb} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-10 h-10 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                        {playable ? (
                          <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition" />
                        ) : (
                          <ExternalLink className="w-9 h-9 text-white/90 drop-shadow-lg opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                      <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/70 text-cyan-200 px-2 py-0.5 rounded">
                        {v.category}
                      </span>
                    </div>
                    <div className="p-3 flex-1">
                      <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-cyan-300 transition">
                        {v.title}
                      </h3>
                      {v.description && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{v.description}</p>}
                      <p className="mt-2 text-[11px] text-slate-500">
                        {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </button>
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => setEditing(v)}
                        title="Sửa video"
                        className="p-1.5 rounded-md bg-black/70 hover:bg-blue-600 text-white"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        title="Xoá video"
                        className="p-1.5 rounded-md bg-black/70 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-5 py-2 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800/60 transition"
              >
                Xem thêm ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
      {editing && (
        <VideoEditorModal
          video={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

const VideoPlayerModal: React.FC<{ video: VideoItem; onClose: () => void }> = ({ video, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-white">{video.title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
          {video.youtubeId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <video src={video.url} controls autoPlay className="w-full h-full" />
          )}
        </div>
        {video.description && <p className="mt-3 text-sm text-slate-300 whitespace-pre-line">{video.description}</p>}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Mở trên trang gốc
        </a>
      </div>
    </div>
  );
};

const VideoEditorModal: React.FC<{ video: VideoItem | null; onClose: () => void; onSaved: () => void }> = ({
  video,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState(video?.url ?? '');
  const [title, setTitle] = useState(video?.title ?? '');
  const [category, setCategory] = useState(video?.category ?? VIDEO_CATEGORIES[0]);
  const [description, setDescription] = useState(video?.description ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl ?? '');
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const youtubeId = parseYouTubeId(url);
  const previewThumb = thumbnailUrl.trim() || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');

  // Auto-fill the title once a valid link is pasted (only while the title is still empty).
  useEffect(() => {
    const link = url.trim();
    if (title.trim() || !(isHttpUrl(link) || youtubeId)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsFetchingTitle(true);
      const found = await fetchVideoTitle(youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : link);
      if (!cancelled) {
        if (found) setTitle((prev) => prev || found);
        setIsFetchingTitle(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const link = youtubeId && !isHttpUrl(url.trim()) ? `https://www.youtube.com/watch?v=${youtubeId}` : url.trim();
    if (!isHttpUrl(link)) return setError('Link video không hợp lệ (phải bắt đầu bằng http:// hoặc https://).');
    if (!title.trim()) return setError('Vui lòng nhập tiêu đề video.');
    if (thumbnailUrl.trim() && !isHttpUrl(thumbnailUrl.trim())) return setError('Link ảnh thu nhỏ không hợp lệ.');
    setIsSaving(true);
    try {
      await storageService.saveVideo({
        id: video?.id,
        url: link,
        youtubeId,
        title: title.trim(),
        category,
        description: description.trim(),
        thumbnailUrl: thumbnailUrl.trim() || null,
      });
      onSaved();
    } catch (err) {
      console.error('Không lưu được video:', err);
      setError('Không lưu được video. Hãy kiểm tra bạn đang đăng nhập bằng tài khoản quản trị.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{video ? 'Sửa video' : 'Thêm video'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Link video (YouTube hoặc link khác) *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
              autoFocus
            />
            {url.trim() && (
              <p className={`mt-1 text-[11px] ${youtubeId ? 'text-emerald-400' : 'text-amber-300'}`}>
                {youtubeId
                  ? 'Video YouTube — sẽ phát ngay trên trang.'
                  : 'Không phải link YouTube — người xem sẽ được mở link ở tab mới (trừ file .mp4/.webm sẽ phát trực tiếp).'}
              </p>
            )}
          </div>

          {previewThumb && (
            <img src={previewThumb} alt="" className="w-full aspect-video object-cover rounded-xl border border-slate-800" />
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Tiêu đề * {isFetchingTitle && <span className="text-cyan-400">(đang lấy tiêu đề...)</span>}
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Chủ đề</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {(VIDEO_CATEGORIES as readonly string[]).includes(category) ? null : <option value={category}>{category}</option>}
              {VIDEO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Mô tả (không bắt buộc)</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-y`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Ảnh thu nhỏ (URL, không bắt buộc{youtubeId ? ' — YouTube tự có ảnh' : ''})
            </label>
            <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200">
            Huỷ bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {video ? 'Lưu thay đổi' : 'Thêm video'}
          </button>
        </div>
      </form>
    </div>
  );
};
