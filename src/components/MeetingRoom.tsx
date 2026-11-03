import React, { useEffect, useRef, useState } from 'react';
import { Video, PlusCircle, LogIn, Copy, Check, ExternalLink, PhoneOff, AlertCircle, Info, Lock } from 'lucide-react';
import { Meeting } from '../types';
import { storageService } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

// Video calls run on Jitsi Meet. The public meet.jit.si cuts embedded calls off after
// 5 minutes, so on it calls open in a new tab instead; a self-hosted server set via
// VITE_JITSI_DOMAIN is embedded in the page.
const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) || 'meet.jit.si';
const EMBED_CALLS = JITSI_DOMAIN !== 'meet.jit.si';
const DISPLAY_NAME_KEY = 'meeting-display-name';

// Jitsi reads config overrides from the URL fragment, values JSON-encoded. With no
// name given, Jitsi's own pre-join screen asks for one.
function jitsiRoomUrl(room: string, displayName: string): string {
  const params = ['config.startWithAudioMuted=true', 'config.startWithVideoMuted=true'];
  if (displayName.trim()) {
    params.unshift(`userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName.trim()))}`);
  }
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(room)}#${params.join('&')}`;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      addListener: (event: string, handler: () => void) => void;
      dispose: () => void;
    };
  }
}

let jitsiScriptPromise: Promise<void> | null = null;
function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!jitsiScriptPromise) {
    jitsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        jitsiScriptPromise = null;
        script.remove();
        reject(new Error('Không tải được Jitsi'));
      };
      document.head.appendChild(script);
    });
  }
  return jitsiScriptPromise;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Random suffix keeps rooms on a shared Jitsi server from colliding with strangers' rooms.
function createRoomId(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  const base = slugify(name);
  return `longhoaso-${base ? `${base}-` : ''}${suffix}`;
}

// Accepts a bare room code, a /phong-hop/{room} link from this site, or a Jitsi link.
export function parseRoomInput(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    value = url.pathname.replace(/\/+$/, '').split('/').pop() || '';
  } catch {
    // not a URL — treat as a room code
  }
  const room = decodeURIComponent(value).replace(/[^a-zA-Z0-9_-]/g, '');
  return room ? room.slice(0, 64) : null;
}

function readSavedName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || '';
  } catch {
    return '';
  }
}

// Google sign-in always returns to the site root; App reads this key to bring the
// visitor back to the meeting page they were on (e.g. an invite link).
export const POST_LOGIN_PATH_KEY = 'post-login-path';

const HEARTBEAT_MS = 60_000;

// Browsers built into chat/social apps (links shared on Zalo, Messenger...) usually
// block camera and microphone access, so calls must be opened in Chrome/Safari.
const IN_APP_BROWSER = /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|musical_ly/i.test(navigator.userAgent);
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Android-only: asks the system to open this page in Chrome instead of the in-app browser.
function chromeIntentUrl(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

const InAppBrowserWarning: React.FC = () => (
  <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
    <div className="space-y-2">
      <p className="font-bold">Bạn đang mở trang trong ứng dụng (Zalo, Facebook...) — trình duyệt này không cho bật camera và micro.</p>
      <p className="text-xs text-amber-200/80">
        Bấm nút <b>⋮</b> hoặc <b>...</b> ở góc màn hình, chọn <b>"Mở bằng trình duyệt"</b> (Chrome hoặc Safari), rồi vào lại phòng họp.
      </p>
      {IS_ANDROID && (
        <a
          href={chromeIntentUrl(window.location.href)}
          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Mở bằng Chrome</span>
        </a>
      )}
    </div>
  </div>
);

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

function formatStartedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

interface MeetingRoomProps {
  room: string | null;
  onRoomChange: (room: string | null) => void;
  onRequireAuth: () => void;
  // Lets App refresh the header's live-meeting badge right after a meeting starts or ends.
  onMeetingsChanged: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ room, onRoomChange, onRequireAuth, onMeetingsChanged }) => {
  const { user, profile, signInWithGoogle } = useAuth();
  const defaultDisplayName = profile?.fullName || user?.user_metadata?.full_name || user?.email || '';
  const [displayName, setDisplayName] = useState(() => readSavedName());
  const [newRoomName, setNewRoomName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  // The signed-in user's own not-yet-ended rooms, live or not, so they can always
  // get back in or end one after leaving its page.
  const [myMeetings, setMyMeetings] = useState<Meeting[]>([]);
  const [lobbyRefreshKey, setLobbyRefreshKey] = useState(0);
  // undefined = still checking, null = room doesn't exist or has ended
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!displayName && defaultDisplayName) setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lobby: list meetings in progress, refreshed while the page stays open.
  useEffect(() => {
    if (room) return;
    let cancelled = false;
    const load = () =>
      Promise.all([
        storageService.getActiveMeetings(),
        user ? storageService.getMyOpenMeetings(user.id) : Promise.resolve([]),
      ])
        .then(([active, mine]) => {
          if (cancelled) return;
          setActiveMeetings(user ? active.filter((m) => m.createdBy !== user.id) : active);
          setMyMeetings(mine);
        })
        .catch((err) => console.error('Không tải được danh sách cuộc họp:', err));
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, room, lobbyRefreshKey]);

  // In a room: confirm it exists, then heartbeat so it shows as live while this page is open.
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    setCurrentMeeting(undefined);
    storageService
      .getMeeting(room)
      .then((meeting) => {
        if (cancelled) return;
        setCurrentMeeting(meeting);
        if (meeting) storageService.touchMeeting(room).then(onMeetingsChanged).catch(() => {});
      })
      .catch((err) => {
        console.error('Không tải được phòng họp:', err);
        if (!cancelled) setCurrentMeeting(null);
      });
    const timer = setInterval(() => {
      storageService.touchMeeting(room).catch(() => {});
    }, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberName = () => {
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
    } catch {
      // storage unavailable (private mode) — the name just won't be remembered
    }
  };

  // Mount the Jitsi call while a room is open; dispose it when leaving or switching rooms.
  const canEmbed = EMBED_CALLS && !!room && !!currentMeeting;
  useEffect(() => {
    if (!room || !canEmbed) return;
    let api: { dispose: () => void } | null = null;
    let cancelled = false;
    setLoadError(null);

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const instance = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: room,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          lang: 'vi',
          userInfo: displayName.trim() ? { displayName: displayName.trim() } : {},
          configOverwrite: {
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
            startWithVideoMuted: true,
          },
        });
        instance.addListener('readyToClose', () => onRoomChange(null));
        api = instance;
      })
      .catch(() => {
        if (!cancelled) setLoadError('Không tải được dịch vụ họp video. Vui lòng kiểm tra mạng và thử lại.');
      });

    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, [room, canEmbed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleLogin = async () => {
    try {
      sessionStorage.setItem(POST_LOGIN_PATH_KEY, window.location.pathname);
    } catch {
      // without storage the visitor just lands on the home page after signing in
    }
    const { error } = await signInWithGoogle();
    if (error) setFormError(`Không đăng nhập được bằng Google: ${error}`);
  };

  // The call tab is opened blank right inside the click (so it isn't blocked as a popup)
  // and pointed at the room once the database step succeeds.
  const enterRoom = async (target: string, prepare: () => Promise<string | null>) => {
    setFormError(null);
    setIsBusy(true);
    rememberName();
    const callTab = EMBED_CALLS ? null : window.open('', '_blank');
    try {
      const error = await prepare();
      if (error) {
        callTab?.close();
        setFormError(error);
        return;
      }
      if (callTab) {
        callTab.opener = null;
        callTab.location.href = jitsiRoomUrl(target, displayName);
      }
      onMeetingsChanged();
      onRoomChange(target);
    } catch (err) {
      console.error('Không vào được phòng họp:', err);
      callTab?.close();
      setFormError('Không kết nối được tới máy chủ. Vui lòng thử lại.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const id = createRoomId(newRoomName);
    const title = newRoomName.trim();
    enterRoom(id, async () => {
      await storageService.createMeeting(id, title, displayName.trim() || defaultDisplayName);
      setNewRoomName('');
      return null;
    });
  };

  const joinRoom = (id: string) =>
    enterRoom(id, async () => {
      const ok = await storageService.touchMeeting(id);
      if (!ok) return 'Phòng họp không tồn tại hoặc đã kết thúc. Vui lòng kiểm tra lại mã phòng.';
      setJoinInput('');
      return null;
    });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRoomInput(joinInput);
    if (!parsed) {
      setFormError('Vui lòng nhập mã phòng hoặc đường link phòng họp hợp lệ.');
      return;
    }
    joinRoom(parsed);
  };

  const handleEndMeeting = async (id: string) => {
    if (!window.confirm('Kết thúc cuộc họp này? Mọi người sẽ không vào lại được bằng link mời nữa.')) return;
    try {
      await storageService.endMeeting(id);
      onMeetingsChanged();
      if (room) onRoomChange(null);
      else setLobbyRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Không kết thúc được cuộc họp:', err);
      setFormError('Không kết thúc được cuộc họp. Vui lòng thử lại.');
    }
  };

  const shareLink = room ? `${window.location.origin}/phong-hop/${encodeURIComponent(room)}` : '';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pageTitle = (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
        <Video className="w-5 h-5 text-blue-400" />
        Phòng Họp Online
      </h1>
      <p className="text-sm text-slate-400 mt-1">
        Họp video, gọi thoại và chia sẻ màn hình ngay trên trình duyệt — không cần cài phần mềm.
      </p>
    </div>
  );

  if (room) {
    if (currentMeeting === undefined) {
      return <div className="text-center py-24 text-slate-400 text-sm">Đang kiểm tra phòng họp...</div>;
    }
    if (currentMeeting === null) {
      return (
        <div className="space-y-6">
          {pageTitle}
          <div className="glass-panel p-6 sm:p-10 flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Phòng họp không tồn tại hoặc đã kết thúc</h2>
              <p className="text-sm text-slate-400 mt-1">Mã phòng: {room}</p>
            </div>
            <button
              type="button"
              onClick={() => onRoomChange(null)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Về danh sách phòng họp
            </button>
          </div>
        </div>
      );
    }

    const isHost = !!user && currentMeeting.createdBy === user.id;
    return (
      <div className="space-y-4">
        <div className="glass-panel p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
              Phòng họp{currentMeeting.createdByName ? ` · Chủ phòng: ${currentMeeting.createdByName}` : ''}
            </p>
            <p className="text-sm sm:text-base font-bold text-slate-100 truncate">{currentMeeting.title || room}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã sao chép link' : 'Sao chép link mời'}</span>
            </button>
            {EMBED_CALLS && (
              <a
                href={jitsiRoomUrl(room, displayName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Mở trong tab mới</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => onRoomChange(null)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Rời phòng</span>
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => handleEndMeeting(room)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Kết thúc cuộc họp</span>
              </button>
            )}
          </div>
        </div>
        {formError && <p className="text-xs text-rose-300">{formError}</p>}
        {IN_APP_BROWSER && <InAppBrowserWarning />}

        {!EMBED_CALLS ? (
          <div className="glass-panel p-6 sm:p-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Cuộc họp mở ở tab mới</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                Cuộc họp chạy trên meet.jit.si ở một tab riêng, không giới hạn thời gian. Nếu tab chưa tự mở hoặc bạn lỡ
                đóng, bấm nút bên dưới để vào lại. Giữ trang này mở để mọi người thấy cuộc họp đang diễn ra.
              </p>
            </div>
            <a
              href={jitsiRoomUrl(room, displayName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Vào cuộc họp</span>
            </a>
            <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-3 max-w-md text-left">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                Người vào phòng đầu tiên có thể được meet.jit.si yêu cầu đăng nhập (Google, GitHub...) để làm chủ phòng;
                những người vào sau chỉ cần chờ chủ phòng.
              </span>
            </div>
            {IS_MOBILE && (
              <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-3 max-w-md text-left">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Trên điện thoại: nếu meet.jit.si gợi ý tải ứng dụng, chọn tham gia bằng trình duyệt hoặc cài ứng dụng
                  Jitsi Meet. Camera tắt sẵn khi vào phòng — bấm biểu tượng camera để bật, và chọn <b>Cho phép</b> khi
                  được hỏi quyền. Nếu lỡ chặn, vào cài đặt trang web của trình duyệt để cấp lại quyền camera.
                </span>
              </div>
            )}
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-[70vh] min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageTitle}
      {IN_APP_BROWSER && <InAppBrowserWarning />}

      {myMeetings.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <Video className="w-5 h-5 text-emerald-400" />
            <span>Phòng họp bạn đã tạo ({myMeetings.length})</span>
          </div>
          <ul className="divide-y divide-slate-800">
            {myMeetings.map((m) => {
              const isLive = Date.now() - new Date(m.lastActiveAt).getTime() < storageService.MEETING_ACTIVE_WINDOW_MS;
              return (
                <li key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate flex items-center gap-2">
                      {isLive && <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 shrink-0" />}
                      <span className="truncate">{m.title || m.id}</span>
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {isLive ? 'Đang diễn ra' : 'Không có ai trong phòng'} · Tạo lúc {formatStartedAt(m.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => joinRoom(m.id)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Vào lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEndMeeting(m.id)}
                      className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Kết thúc</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeMeetings.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span>Cuộc họp đang diễn ra ({activeMeetings.length})</span>
          </div>
          <ul className="divide-y divide-slate-800">
            {activeMeetings.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{m.title || m.id}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {m.createdByName ? `${m.createdByName} · ` : ''}Bắt đầu lúc {formatStartedAt(m.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => joinRoom(m.id)}
                  disabled={isBusy}
                  className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Tham gia</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-panel p-5 sm:p-6">
        <label className="block text-xs font-medium text-slate-400 mb-1">Tên hiển thị của bạn trong cuộc họp</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="Ví dụ: Cô Lan - Tổ Toán"
          className="w-full sm:max-w-sm bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>

      {formError && (
        <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {user ? (
          <form onSubmit={handleCreate} className="glass-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-bold">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span>Tạo phòng họp mới</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tên phòng (không bắt buộc)</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                maxLength={60}
                placeholder="Ví dụ: Họp tổ chuyên môn tháng 11"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>{isBusy ? 'Đang mở phòng...' : 'Tạo phòng và vào họp'}</span>
            </button>
            <p className="text-xs text-slate-500">Sau khi vào phòng, bấm "Sao chép link mời" để gửi cho người khác tham gia.</p>
          </form>
        ) : (
          <div className="glass-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-bold">
              <Lock className="w-5 h-5 text-emerald-400" />
              <span>Tạo phòng họp mới</span>
            </div>
            <p className="text-sm text-slate-400">
              Cần đăng nhập bằng tài khoản Gmail để tạo phòng họp. Tham gia phòng của người khác thì không cần đăng nhập.
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg transition-colors"
            >
              <GoogleIcon />
              <span>Đăng nhập bằng Google để tạo phòng</span>
            </button>
            <button type="button" onClick={onRequireAuth} className="block mx-auto text-xs text-slate-400 hover:text-slate-200 underline">
              Cách đăng nhập khác
            </button>
          </div>
        )}

        <form onSubmit={handleJoin} className="glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <LogIn className="w-5 h-5 text-blue-400" />
            <span>Tham gia phòng họp</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Mã phòng hoặc link mời</label>
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="longhoaso-hop-to-toan-ab12cd hoặc https://..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Vào phòng</span>
          </button>
        </form>
      </div>
    </div>
  );
};
