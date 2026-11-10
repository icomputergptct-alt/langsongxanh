import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Monitor, PlayCircle, Plus, Pencil, Trash2, X, Search, ExternalLink, Loader2, Film,
  Play, Pause, Volume2, VolumeX, Captions, Maximize, Minimize, SkipBack, SkipForward, ListVideo,
  RectangleHorizontal, Square,
} from 'lucide-react';
import { VideoItem, VIDEO_CATEGORIES } from '../types';
import { storageService } from '../services/storageService';

const PAGE_SIZE = 12;
const THEATER_KEY = 'lhs_video_theater_v1';

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

// The playlist ("series") id from a YouTube link's list= parameter, if any.
export const parsePlaylistId = (input: string): string | null => {
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') return null;
    const list = u.searchParams.get('list');
    return list && /^[\w-]{10,}$/.test(list) ? list : null;
  } catch {
    return null;
  }
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

// Best-effort title/thumbnail lookup so the admin only has to paste a link.
async function fetchOEmbed(url: string): Promise<{ title: string; thumbnail: string | null } | null> {
  const endpoints = [
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data?.title === 'string' && data.title.trim()) {
        return { title: data.title.trim(), thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null };
      }
    } catch {
      /* try the next one */
    }
  }
  return null;
}

const fetchVideoTitle = async (url: string) => (await fetchOEmbed(url))?.title ?? null;

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
    if (v.youtubeId || parsePlaylistId(v.url) || isDirectVideoFile(v.url)) setPlaying(v);
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
              const isSeries = !!parsePlaylistId(v.url);
              const playable = !!v.youtubeId || isSeries || isDirectVideoFile(v.url);
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
                      {isSeries && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-semibold bg-blue-600/90 text-white px-2 py-0.5 rounded">
                          <ListVideo className="w-3 h-3" /> Danh sách phát
                        </span>
                      )}
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

// YouTube's current embed UI only offers a small mute toggle (no volume slider) and
// tucks CC/fullscreen into the corners, so we drive the player through the official
// IFrame API and show our own control bar under it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YTPlayer = any;
let ytApiPromise: Promise<void> | null = null;
const loadYouTubeApi = (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve();
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
  }
  return ytApiPromise;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// Titles for the playlist sidebar, looked up once per video id via oEmbed.
const titleCache = new Map<string, Promise<string | null>>();
const lookupTitle = (id: string) => {
  if (!titleCache.has(id)) titleCache.set(id, fetchVideoTitle(`https://www.youtube.com/watch?v=${id}`));
  return titleCache.get(id)!;
};

const YouTubePlayer: React.FC<{
  videoId: string | null;
  playlistId: string | null;
  onCurrentTitle?: (title: string | null) => void;
  theater?: boolean;
  onToggleTheater?: () => void;
}> = ({ videoId, playlistId, onCurrentTitle, theater = false, onToggleTheater }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // YouTube picks the stream quality from the player's on-screen size, so an ~800px
  // frame only ever gets 480p. The iframe is laid out at a Full HD size (in device
  // pixels) and scaled down to fit, which makes YouTube choose 1080p when the video
  // has it — and it still steps down by itself on a slow connection.
  const frameRef = useRef<HTMLDivElement>(null);
  const baseW = Math.round(1920 / (window.devicePixelRatio || 1));
  const baseH = Math.round((baseW * 9) / 16);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / baseW, el.clientHeight / baseH) || 0.4);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW, baseH]);

  // Our own seek bar: poll the position while the player is up.
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setCurrentTime(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
    }, 500);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    let destroyed = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const syncPlaylist = () => {
      const p = playerRef.current;
      if (!p?.getPlaylist) return;
      const ids: string[] | null = p.getPlaylist();
      if (ids?.length) {
        setPlaylist((prev) => (prev.length === ids.length && prev.every((x, i) => x === ids[i]) ? prev : ids));
        setPlaylistIndex(p.getPlaylistIndex());
      }
    };
    loadYouTubeApi().then(() => {
      if (destroyed || !mountRef.current) return;
      // The API replaces the mount node with its iframe; give it a child to replace
      // so React's own node stays put.
      const target = document.createElement('div');
      mountRef.current.appendChild(target);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(target, {
        ...(videoId ? { videoId } : {}),
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          rel: 0,
          playsinline: 1,
          // YouTube's own controls would be shrunk along with the scaled-down frame;
          // the bar below replaces them.
          controls: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
          ...(playlistId ? { listType: 'playlist', list: playlistId } : {}),
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (destroyed) return;
            setReady(true);
            setVolume(e.target.getVolume());
            setMuted(e.target.isMuted());
            if (playlistId) {
              // The playlist arrives a moment after the player is ready.
              syncPlaylist();
              poll = setInterval(syncPlaylist, 1000);
              setTimeout(() => clearInterval(poll), 15000);
            }
          },
          onStateChange: (e: { data: number }) => {
            setIsPlaying(e.data === 1 || e.data === 3);
            if (playlistId) syncPlaylist();
          },
          // The captions module loads once a caption track is shown.
          onApiChange: () => {
            const opts: string[] = playerRef.current?.getOptions?.() || [];
            if (opts.includes('captions')) setCaptionsOn(true);
          },
        },
      });
    });
    return () => {
      destroyed = true;
      clearInterval(poll);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId, playlistId]);

  // Fill in sidebar titles a few at a time.
  useEffect(() => {
    let cancelled = false;
    const queue = [...playlist];
    const worker = async () => {
      while (!cancelled && queue.length) {
        const id = queue.shift()!;
        const title = await lookupTitle(id);
        if (!cancelled && title) setTitles((prev) => (prev[id] ? prev : { ...prev, [id]: title }));
      }
    };
    for (let i = 0; i < 4; i++) void worker();
    return () => {
      cancelled = true;
    };
  }, [playlist]);

  const currentTitle = playlist[playlistIndex] ? titles[playlist[playlistIndex]] ?? null : null;
  useEffect(() => {
    onCurrentTitle?.(currentTitle);
  }, [currentTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the playing item in view in the sidebar.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${playlistIndex}"]`);
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - listRef.current.offsetTop - 8, behavior: 'smooth' });
    }
  }, [playlistIndex, playlist]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const player = () => (ready ? playerRef.current : null);

  const togglePlay = () => {
    const p = player();
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  };

  const changeVolume = (v: number) => {
    const p = player();
    if (!p) return;
    setVolume(v);
    p.setVolume(v);
    if (v > 0 && muted) {
      p.unMute();
      setMuted(false);
    } else if (v === 0) {
      p.mute();
      setMuted(true);
    }
  };

  const toggleMute = () => {
    const p = player();
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
      if (volume === 0) changeVolume(50);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const toggleCaptions = () => {
    const p = player();
    if (!p) return;
    if (captionsOn) p.unloadModule('captions');
    else p.loadModule('captions');
    setCaptionsOn(!captionsOn);
  };

  const changeSpeed = (v: number) => {
    setSpeed(v);
    player()?.setPlaybackRate(v);
  };

  const playAt = (index: number) => {
    const p = player();
    if (!p || index < 0 || index >= playlist.length) return;
    p.playVideoAt(index);
    setPlaylistIndex(index);
  };

  const seek = (seconds: number) => {
    setCurrentTime(seconds);
    player()?.seekTo(seconds, true);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current?.requestFullscreen?.();
  };

  const btn = 'p-2 rounded-lg text-slate-200 hover:bg-slate-700/70 disabled:opacity-40 transition';
  const hasList = playlist.length > 1;

  const playerColumn = (
    <div
      ref={wrapperRef}
      className={`flex flex-col bg-black overflow-hidden ${isFullscreen ? 'w-full h-full' : 'rounded-xl border border-slate-800'}`}
    >
      <div
        ref={frameRef}
        className={`relative overflow-hidden ${
          isFullscreen ? 'flex-1 min-h-0' : theater ? 'aspect-video max-h-[calc(100vh-9rem)]' : 'aspect-video'
        }`}
      >
        <div
          ref={mountRef}
          className="absolute left-1/2 top-1/2 [&>iframe]:w-full [&>iframe]:h-full"
          style={{ width: baseW, height: baseH, transform: `translate(-50%, -50%) scale(${scale})` }}
        />
        {/* Click to play/pause, double-click for fullscreen (YouTube's own UI is hidden). */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center gap-2 px-3 pt-2 bg-slate-900/95 border-t border-slate-800">
        <span className="text-[11px] tabular-nums text-slate-300 w-12 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          disabled={!ready || !duration}
          aria-label="Tua video"
          className="flex-1 accent-red-500"
        />
        <span className="text-[11px] tabular-nums text-slate-400 w-12">{formatTime(duration)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-2 pb-1.5 pt-0.5 bg-slate-900/95">
        {hasList && (
          <button type="button" onClick={() => playAt(playlistIndex - 1)} disabled={!ready || playlistIndex <= 0} className={btn} title="Video trước">
            <SkipBack className="w-5 h-5" />
          </button>
        )}
        <button type="button" onClick={togglePlay} disabled={!ready} className={btn} title={isPlaying ? 'Tạm dừng' : 'Phát'}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        {hasList && (
          <button
            type="button"
            onClick={() => playAt(playlistIndex + 1)}
            disabled={!ready || playlistIndex >= playlist.length - 1}
            className={btn}
            title="Video tiếp theo"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        )}
        <button type="button" onClick={toggleMute} disabled={!ready} className={btn} title={muted ? 'Bật tiếng' : 'Tắt tiếng'}>
          {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          disabled={!ready}
          title="Âm lượng"
          aria-label="Âm lượng"
          className="w-20 sm:w-32 accent-cyan-400"
        />
        <span className="text-[11px] text-slate-400 w-8">{muted ? 0 : volume}%</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={toggleCaptions}
          disabled={!ready}
          className={`${btn} flex items-center gap-1 text-xs font-semibold ${captionsOn ? 'text-cyan-300' : ''}`}
          title={captionsOn ? 'Tắt phụ đề' : 'Bật phụ đề'}
        >
          <Captions className="w-5 h-5" />
          <span className="hidden sm:inline">{captionsOn ? 'Tắt phụ đề' : 'Bật phụ đề'}</span>
        </button>
        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          disabled={!ready}
          title="Tốc độ phát"
          className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 px-1.5 py-1 focus:outline-none"
        >
          {SPEEDS.map((v) => (
            <option key={v} value={v}>
              {v === 1 ? 'Tốc độ 1x' : `${v}x`}
            </option>
          ))}
        </select>
        {onToggleTheater && !isFullscreen && (
          <button
            type="button"
            onClick={onToggleTheater}
            className={`${btn} ${theater ? 'text-cyan-300' : ''}`}
            title={theater ? 'Chế độ mặc định' : 'Chế độ rạp (khung lớn)'}
          >
            {theater ? <Square className="w-5 h-5" /> : <RectangleHorizontal className="w-5 h-5" />}
          </button>
        )}
        <button type="button" onClick={toggleFullscreen} className={btn} title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  if (!playlistId) return playerColumn;

  return (
    <div className={`flex flex-col gap-3 ${theater ? '' : 'lg:flex-row'}`}>
      <div className="flex-1 min-w-0">{playerColumn}</div>
      <aside
        className={`shrink-0 flex flex-col rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden ${
          theater ? 'max-h-[50vh]' : 'lg:w-80 max-h-[40vh] lg:max-h-[min(70vh,560px)]'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800 text-sm font-semibold text-slate-100">
          <ListVideo className="w-4 h-4 text-cyan-400" />
          <span>Danh sách phát</span>
          {playlist.length > 0 && (
            <span className="ml-auto text-xs font-normal text-slate-400">
              {playlistIndex + 1}/{playlist.length}
            </span>
          )}
        </div>
        <div
          ref={listRef}
          className={`flex-1 overflow-y-auto p-1.5 ${theater ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 content-start' : 'space-y-1'}`}
        >
          {playlist.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách...
            </div>
          ) : (
            playlist.map((id, i) => (
              <button
                key={`${id}-${i}`}
                type="button"
                data-index={i}
                onClick={() => playAt(i)}
                className={`w-full flex gap-2 p-1.5 rounded-lg text-left transition ${
                  i === playlistIndex ? 'bg-blue-600/25 ring-1 ring-blue-400/40' : 'hover:bg-slate-800/70'
                }`}
              >
                <span className="w-5 shrink-0 self-center text-center text-[11px] text-slate-500">
                  {i === playlistIndex ? <Play className="w-3 h-3 mx-auto text-cyan-300 fill-cyan-300" /> : i + 1}
                </span>
                <img
                  src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  className="w-24 aspect-video object-cover rounded-md bg-slate-950 shrink-0"
                />
                <span className={`text-xs line-clamp-3 ${i === playlistIndex ? 'text-white font-semibold' : 'text-slate-300'}`}>
                  {titles[id] || `Video ${i + 1}`}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

const VideoPlayerModal: React.FC<{ video: VideoItem; onClose: () => void }> = ({ video, onClose }) => {
  const playlistId = parsePlaylistId(video.url);
  // In a series, the heading follows whichever video is playing.
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  // "Chế độ rạp": the player spreads across the screen; remembered for this browser.
  const [theater, setTheater] = useState(() => {
    try {
      return localStorage.getItem(THEATER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleTheater = () =>
    setTheater((prev) => {
      try {
        localStorage.setItem(THEATER_KEY, prev ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !prev;
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${theater ? 'p-2 sm:p-3' : 'p-4'}`}
      onClick={onClose}
    >
      <div
        className={`w-full ${theater ? 'max-w-[1800px]' : playlistId ? 'max-w-6xl' : 'max-w-4xl'} max-h-full overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white">{currentTitle || video.title}</h2>
            {currentTitle && currentTitle !== video.title && <p className="text-xs text-slate-400">{video.title}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        {video.youtubeId || playlistId ? (
          <YouTubePlayer
            videoId={video.youtubeId}
            playlistId={playlistId}
            onCurrentTitle={setCurrentTitle}
            theater={theater}
            onToggleTheater={toggleTheater}
          />
        ) : (
          <div className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
            <video src={video.url} controls autoPlay className="w-full h-full" />
          </div>
        )}
        {video.description && <p className="mt-3 text-sm text-slate-300 whitespace-pre-line">{video.description}</p>}
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
  const playlistId = parsePlaylistId(url);
  // A playlist-only link (no v=) has no video id to build a thumbnail from; oEmbed supplies one.
  const [playlistThumb, setPlaylistThumb] = useState<string | null>(null);
  const previewThumb =
    thumbnailUrl.trim() || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : playlistThumb || '');

  // Auto-fill the title once a valid link is pasted (only while the title is still empty).
  // For a series the playlist's own title is used rather than the first video's.
  useEffect(() => {
    const link = url.trim();
    setPlaylistThumb(null);
    if (!(isHttpUrl(link) || youtubeId)) return;
    if (title.trim() && !(playlistId && !youtubeId)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsFetchingTitle(true);
      const lookup = playlistId
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : youtubeId
          ? `https://www.youtube.com/watch?v=${youtubeId}`
          : link;
      const found = await fetchOEmbed(lookup);
      if (!cancelled) {
        if (found) {
          setTitle((prev) => prev || found.title);
          if (playlistId && !youtubeId) setPlaylistThumb(found.thumbnail);
        }
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
        thumbnailUrl: thumbnailUrl.trim() || (!youtubeId ? playlistThumb : null) || null,
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
              <p className={`mt-1 text-[11px] ${youtubeId || playlistId ? 'text-emerald-400' : 'text-amber-300'}`}>
                {playlistId
                  ? 'Danh sách phát YouTube — người xem sẽ thấy cả dãy video của series bên cạnh trình phát.'
                  : youtubeId
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
