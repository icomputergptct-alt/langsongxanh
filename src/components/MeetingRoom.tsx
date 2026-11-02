import React, { useEffect, useRef, useState } from 'react';
import { Video, PlusCircle, LogIn, Copy, Check, ExternalLink, PhoneOff, AlertCircle, Info } from 'lucide-react';

// Video calls run on Jitsi Meet. The public meet.jit.si cuts embedded calls off after
// 5 minutes, so production should point VITE_JITSI_DOMAIN at a self-hosted Jitsi or JaaS.
const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) || 'meet.jit.si';
const IS_PUBLIC_JITSI = JITSI_DOMAIN === 'meet.jit.si';
const DISPLAY_NAME_KEY = 'meeting-display-name';

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

interface MeetingRoomProps {
  room: string | null;
  defaultDisplayName?: string;
  onRoomChange: (room: string | null) => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ room, defaultDisplayName, onRoomChange }) => {
  const [displayName, setDisplayName] = useState(() => readSavedName() || defaultDisplayName || '');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!displayName && defaultDisplayName) setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberName = () => {
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
    } catch {
      // storage unavailable (private mode) — the name just won't be remembered
    }
  };

  // Mount the Jitsi call while a room is open; dispose it when leaving or switching rooms.
  useEffect(() => {
    if (!room) return;
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
          userInfo: { displayName: displayName.trim() || 'Khách' },
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
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    rememberName();
    onRoomChange(createRoomId(newRoomName));
    setNewRoomName('');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRoomInput(joinInput);
    if (!parsed) {
      setJoinError('Vui lòng nhập mã phòng hoặc đường link phòng họp hợp lệ.');
      return;
    }
    setJoinError(null);
    rememberName();
    onRoomChange(parsed);
    setJoinInput('');
  };

  const shareLink = room ? `${window.location.origin}/phong-hop/${encodeURIComponent(room)}` : '';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (room) {
    return (
      <div className="space-y-4">
        <div className="glass-panel p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Phòng họp</p>
            <p className="text-sm sm:text-base font-bold text-slate-100 truncate">{room}</p>
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
            <a
              href={`https://${JITSI_DOMAIN}/${encodeURIComponent(room)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở trong tab mới</span>
            </a>
            <button
              type="button"
              onClick={() => onRoomChange(null)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Rời phòng</span>
            </button>
          </div>
        </div>

        {IS_PUBLIC_JITSI && (
          <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Máy chủ họp miễn phí meet.jit.si chỉ cho họp nhúng trên web tối đa 5 phút. Nếu cuộc họp dài hơn, hãy bấm
              "Mở trong tab mới" để tiếp tục không giới hạn thời gian.
            </span>
          </div>
        )}

        {loadError ? (
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-400" />
          Phòng Họp Online
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Họp video, gọi thoại và chia sẻ màn hình ngay trên trình duyệt — không cần cài phần mềm hay tạo tài khoản.
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <Video className="w-4 h-4" />
            <span>Tạo phòng và vào họp</span>
          </button>
          <p className="text-xs text-slate-500">Sau khi vào phòng, bấm "Sao chép link mời" để gửi cho người khác tham gia.</p>
        </form>

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
          {joinError && <p className="text-xs text-rose-300">{joinError}</p>}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Vào phòng</span>
          </button>
        </form>
      </div>
    </div>
  );
};
