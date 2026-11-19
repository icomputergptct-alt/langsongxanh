import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Headphones,
  Play,
  Pause,
  AlertTriangle,
  Loader2,
  Volume1,
  Volume2,
  VolumeX,
  Settings2,
} from 'lucide-react';
import {
  buildReaderSegments,
  segmentHash,
  CLOUD_SEGMENT_LENGTH,
  DEVICE_SEGMENT_LENGTH,
  CLOUD_VOICES,
} from '../utils/readerSegments';

interface ArticleReaderProps {
  article: { id: string; title: string; summary: string; content: string };
  /** Called with the block being read, or null once reading stops. */
  onActiveBlockChange: (block: string | null) => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75];
const DEFAULT_RATE = 1.25;
const RATE_KEY = 'lhs-tts-rate';
const VOLUME_KEY = 'lhs-tts-volume';
const VOICE_KEY = 'lhs-tts-voice2';
const PREFETCH_AHEAD = 2;

const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the choice just isn't remembered */
  }
};

// Natural/online voices sound far better than the old offline ones, so list them first.
const voiceScore = (v: SpeechSynthesisVoice) =>
  (/natural|online|neural/i.test(v.name) ? 2 : 0) + (/google|microsoft|linh/i.test(v.name) ? 1 : 0);

const hasSpeechSynthesis = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const getVietnameseVoices = (): SpeechSynthesisVoice[] =>
  hasSpeechSynthesis()
    ? window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('vi'))
        .sort((a, b) => voiceScore(b) - voiceScore(a))
    : [];

// A voice choice: Google's voice fetched through the server ("cloud:google"), or one built into
// the browser/OS ("device:<voiceURI>").
type VoiceChoice = { engine: 'cloud'; id: string } | { engine: 'device'; id: string };
const parseChoice = (value: string | null): VoiceChoice | null => {
  if (!value) return null;
  const [engine, ...rest] = value.split(':');
  const id = rest.join(':');
  if (engine === 'cloud' && CLOUD_VOICES.some((v) => v.id === id)) return { engine, id };
  if (engine === 'device' && id) return { engine, id };
  return null;
};
const choiceKey = (c: VoiceChoice) => `${c.engine}:${c.id}`;

/**
 * Reads the article aloud in Vietnamese. Uses Google's free Vietnamese voice through
 * /api/tts by default, since most visitors use Chrome, which has no Vietnamese voice on desktop;
 * a Vietnamese voice built into the browser (Edge, Safari, Android) is offered too and
 * is the fallback whenever the Google voice can't be reached.
 */
export const ArticleReader: React.FC<ArticleReaderProps> = ({ article, onActiveBlockChange }) => {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(() => {
    const stored = Number(readStored(RATE_KEY));
    return RATES.includes(stored) ? stored : DEFAULT_RATE;
  });
  // 0–1; muting keeps the level so unmuting goes back to it.
  const [volume, setVolume] = useState(() => {
    const stored = readStored(VOLUME_KEY);
    const n = stored === null ? NaN : Number(stored);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 1;
  });
  const [muted, setMuted] = useState(false);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>(getVietnameseVoices);
  const [choice, setChoice] = useState<VoiceChoice>(
    () => parseChoice(readStored(VOICE_KEY)) ?? { engine: 'cloud', id: CLOUD_VOICES[0].id }
  );
  // A remembered device voice may not exist on this browser — fall back to the Google voice.
  const deviceVoice =
    choice.engine === 'device' ? deviceVoices.find((v) => v.voiceURI === choice.id) ?? null : null;
  const engine: 'cloud' | 'device' = choice.engine === 'device' && deviceVoice ? 'device' : 'cloud';
  const cloudVoice = choice.engine === 'cloud' ? choice.id : CLOUD_VOICES[0].id;

  const segments = useMemo(
    () => buildReaderSegments(article, engine === 'cloud' ? CLOUD_SEGMENT_LENGTH : DEVICE_SEGMENT_LENGTH),
    [article, engine]
  );

  // Each play/stop bumps the session, so callbacks from abandoned playback are ignored.
  const sessionRef = useRef(0);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const effectiveVolume = muted ? 0 : volume;
  const volumeRef = useRef(effectiveVolume);
  volumeRef.current = effectiveVolume;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedRef = useRef<{ key: string; index: number } | null>(null);
  // Fetched Google recordings for this article, as object URLs keyed by "voice|index".
  const audioUrlsRef = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    if (!hasSpeechSynthesis()) return;
    const load = () => setDeviceVoices(getVietnameseVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // Stop talking and free recordings when the reader leaves the article.
  useEffect(
    () => () => {
      sessionRef.current++;
      if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
      audioRef.current?.pause();
      audioUrlsRef.current.forEach((p) => p.then(URL.revokeObjectURL, () => {}));
      audioUrlsRef.current.clear();
    },
    []
  );

  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  };

  const fetchCloudSegment = (i: number, voice: string): Promise<string> => {
    const key = `${voice}|${i}`;
    const existing = audioUrlsRef.current.get(key);
    if (existing) return existing;
    const params = new URLSearchParams({
      article: article.id,
      i: String(i),
      h: segmentHash(segments[i].text),
    });
    const promise = fetch(`/api/tts?${params}`).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Không tải được giọng đọc Google.');
      }
      return URL.createObjectURL(await res.blob());
    });
    audioUrlsRef.current.set(key, promise);
    // A failed fetch shouldn't stay cached, so the next try asks again.
    promise.catch(() => audioUrlsRef.current.delete(key));
    return promise;
  };

  const finish = () => {
    setStatus('idle');
    setIsLoading(false);
    setIndex(0);
    onActiveBlockChange(null);
  };

  const stopOutput = () => {
    sessionRef.current++;
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    audioRef.current?.pause();
  };

  const playCloud = async (i: number, session: number) => {
    const voice = cloudVoice;
    setIsLoading(true);
    for (let k = 1; k <= PREFETCH_AHEAD && i + k < segments.length; k++) {
      fetchCloudSegment(i + k, voice).catch(() => {});
    }
    let url: string;
    try {
      url = await fetchCloudSegment(i, voice);
    } catch (err: any) {
      if (sessionRef.current !== session) return;
      handleCloudFailure(i, err?.message);
      return;
    }
    if (sessionRef.current !== session) return;
    const audio = getAudio();
    audio.src = url;
    audio.playbackRate = rateRef.current;
    audio.volume = volumeRef.current;
    loadedRef.current = { key: `${voice}|${i}`, index: i };
    audio.onended = () => {
      if (sessionRef.current === session) speakFrom(i + 1);
    };
    try {
      await audio.play();
      if (sessionRef.current === session) setIsLoading(false);
    } catch {
      if (sessionRef.current !== session) return;
      setIsLoading(false);
      setStatus('paused');
    }
  };

  // The Google voice is unreachable (offline, blocked, server not configured): switch to a
  // Vietnamese voice built into the browser if there is one, otherwise stop with a message.
  const handleCloudFailure = (i: number, message?: string) => {
    const fallback = deviceVoices[0];
    if (fallback) {
      setError('Không tải được giọng đọc Google, đã chuyển sang giọng có sẵn của trình duyệt.');
      const block = segments[i]?.block;
      setChoice({ engine: 'device', id: fallback.voiceURI });
      // Segments are re-split for the new engine; resume once that's rendered.
      pendingResumeBlockRef.current = block ?? 'title';
    } else {
      setError(message || 'Không tải được giọng đọc Google. Vui lòng thử lại sau.');
      setIsLoading(false);
      setStatus('paused');
    }
  };

  const playDevice = (i: number, session: number) => {
    setIsLoading(false);
    const utterance = new SpeechSynthesisUtterance(segments[i].text);
    utterance.lang = 'vi-VN';
    if (deviceVoice) utterance.voice = deviceVoice;
    utterance.rate = rateRef.current;
    utterance.volume = volumeRef.current;
    utterance.onend = () => {
      if (sessionRef.current === session) speakFrom(i + 1);
    };
    utterance.onerror = (e) => {
      if (sessionRef.current !== session || e.error === 'interrupted' || e.error === 'canceled') return;
      // Skip a segment the engine choked on rather than stopping the whole article.
      speakFrom(i + 1);
    };
    window.speechSynthesis.speak(utterance);
  };

  const speakFrom = (start: number) => {
    stopOutput();
    const session = sessionRef.current;
    if (start >= segments.length) {
      finish();
      return;
    }
    const i = Math.max(0, start);
    setIndex(i);
    setStatus('playing');
    onActiveBlockChange(segments[i].block);
    if (engine === 'cloud') playCloud(i, session);
    else playDevice(i, session);
  };

  // After switching voice engines mid-read, continue from the same paragraph.
  const pendingResumeBlockRef = useRef<string | null>(null);
  useEffect(() => {
    const block = pendingResumeBlockRef.current;
    if (block === null) return;
    pendingResumeBlockRef.current = null;
    const i = segments.findIndex((s) => s.block === block);
    speakFrom(i >= 0 ? i : 0);
  }, [segments]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = () => {
    sessionRef.current++;
    if (engine === 'cloud') {
      audioRef.current?.pause();
    } else {
      // speechSynthesis.pause() is unreliable (Chrome drops online voices on resume),
      // so the device engine restarts the current segment instead.
      window.speechSynthesis.cancel();
    }
    setIsLoading(false);
    setStatus('paused');
  };

  const resume = () => {
    const audio = audioRef.current;
    const loaded = loadedRef.current;
    if (engine === 'cloud' && audio && loaded && loaded.index === index && loaded.key === `${cloudVoice}|${index}` && !audio.ended) {
      const session = ++sessionRef.current;
      audio.playbackRate = rateRef.current;
      audio.onended = () => {
        if (sessionRef.current === session) speakFrom(index + 1);
      };
      setStatus('playing');
      onActiveBlockChange(segments[index].block);
      audio.play().catch(() => setStatus('paused'));
      return;
    }
    speakFrom(index);
  };


  const changeRate = (value: number) => {
    setRate(value);
    rateRef.current = value;
    writeStored(RATE_KEY, String(value));
    if (engine === 'cloud') {
      if (audioRef.current) audioRef.current.playbackRate = value;
    } else if (status === 'playing') {
      speakFrom(index);
    }
  };

  // The Google voice changes volume live; a browser voice can't change mid-sentence,
  // so it picks the new level up from the next segment (mute restarts the current one).
  const applyVolume = (next: number, restartDevice: boolean) => {
    volumeRef.current = next;
    if (engine === 'cloud') {
      if (audioRef.current) audioRef.current.volume = next;
    } else if (restartDevice && status === 'playing') {
      speakFrom(index);
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    setMuted(false);
    writeStored(VOLUME_KEY, String(value));
    applyVolume(value, false);
  };

  const toggleMute = () => {
    const nextMuted = !(muted || volume === 0);
    // Unmuting from a level of 0 should actually make sound.
    const level = !nextMuted && volume === 0 ? 0.5 : volume;
    if (level !== volume) {
      setVolume(level);
      writeStored(VOLUME_KEY, String(level));
    }
    setMuted(nextMuted);
    applyVolume(nextMuted ? 0 : level, true);
  };

  const changeVoice = (value: string) => {
    const next = parseChoice(value);
    if (!next) return;
    setError(null);
    writeStored(VOICE_KEY, value);
    const wasPlaying = status === 'playing';
    const block = segments[index]?.block ?? 'title';
    stopOutput();
    setChoice(next);
    if (wasPlaying) pendingResumeBlockRef.current = block;
    else if (status === 'paused') {
      // Keep the paused spot on the same paragraph in the new engine's segments.
      pendingPausedBlockRef.current = block;
    }
  };
  const pendingPausedBlockRef = useRef<string | null>(null);
  useEffect(() => {
    const block = pendingPausedBlockRef.current;
    if (block === null) return;
    pendingPausedBlockRef.current = null;
    const i = segments.findIndex((s) => s.block === block);
    setIndex(i >= 0 ? i : 0);
    loadedRef.current = null;
  }, [segments]);

  // Drop-down panels under the toolbar pill: volume (speaker icon) or speed/voice (gear).
  const [openPanel, setOpenPanel] = useState<'volume' | 'settings' | null>(null);
  const menuOpen = openPanel !== null;
  const togglePanel = (panel: 'volume' | 'settings') => setOpenPanel((p) => (p === panel ? null : panel));
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen && !error) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
        setError(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, error]);

  if (segments.length === 0) return null;

  const progress = status === 'idle' ? 0 : ((index + (status === 'playing' ? 0.5 : 0)) / segments.length) * 100;
  const label = isLoading
    ? 'Đang tải…'
    : status === 'playing'
      ? 'Đang đọc'
      : status === 'paused'
        ? 'Tạm dừng'
        : 'Nghe đọc';
  const iconBtn =
    'p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';

  return (
    <div ref={rootRef} data-print-hide className="relative">
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs text-slate-200">
        <button
          type="button"
          onClick={() => (status === 'playing' ? pause() : status === 'paused' ? resume() : speakFrom(0))}
          aria-label={status === 'playing' ? 'Tạm dừng' : 'Nghe đọc bài viết'}
          title={status === 'playing' ? 'Tạm dừng' : 'Nghe đọc bài viết'}
          className="flex items-center justify-center w-7 h-7 shrink-0 rounded-md bg-gradient-to-br from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : status === 'playing' ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        <div className="px-1.5 w-[86px]">
          <div className="flex items-center justify-between gap-1 text-[10px] font-semibold leading-none">
            <span className="flex items-center gap-1 text-emerald-300 truncate">
              <Headphones className="w-3 h-3 shrink-0" />
              {label}
            </span>
            {status !== 'idle' && (
              <span className="text-slate-500 tabular-nums">
                {index + 1}/{segments.length}
              </span>
            )}
          </div>
          <div
            className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden cursor-pointer"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            title="Bấm để nhảy tới đoạn này"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              speakFrom(Math.min(segments.length - 1, Math.floor(ratio * segments.length)));
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => togglePanel('volume')}
          aria-label="Âm lượng"
          aria-expanded={openPanel === 'volume'}
          title={`Âm lượng ${Math.round(effectiveVolume * 100)}%`}
          className={`${iconBtn} ${openPanel === 'volume' ? 'bg-slate-800 text-emerald-300' : ''}`}
        >
          {effectiveVolume === 0 ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : effectiveVolume < 0.5 ? (
            <Volume1 className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => togglePanel('settings')}
          aria-label="Tốc độ đọc"
          aria-expanded={openPanel === 'settings'}
          title="Tốc độ đọc"
          className={`${iconBtn} ${openPanel === 'settings' ? 'bg-slate-800 text-emerald-300' : ''}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {openPanel === 'volume' && (
        <div className="absolute right-0 top-full mt-2 z-30 w-56 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs text-slate-200">
          <span className="flex items-center justify-between text-slate-400 mb-2">
            Âm lượng <span className="tabular-nums text-slate-200 font-semibold">{Math.round(effectiveVolume * 100)}%</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={effectiveVolume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              title={effectiveVolume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
            >
              {effectiveVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={effectiveVolume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Âm lượng"
              autoFocus
              className="flex-1 accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {openPanel === 'settings' && (
        <div className="absolute right-0 top-full mt-2 z-30 w-64 p-3 space-y-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs text-slate-200">
          <div>
            <span className="block text-slate-400 mb-1.5">Tốc độ</span>
            <div className="flex gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRate(r)}
                  className={`flex-1 py-1 rounded-md border text-[11px] transition-colors ${
                    rate === r
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* Only worth a picker when the browser has Vietnamese voices of its own. */}
          {deviceVoices.length > 0 && (
            <label className="block">
              <span className="block text-slate-400 mb-1.5">Giọng đọc</span>
              <select
                value={engine === 'device' ? choiceKey(choice) : `cloud:${cloudVoice}`}
                onChange={(e) => changeVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200"
              >
                <option value={`cloud:${CLOUD_VOICES[0].id}`}>Mặc định</option>
                {deviceVoices.map((v) => (
                  <option key={v.voiceURI} value={`device:${v.voiceURI}`}>
                    {v.name.replace(/^Microsoft\s+/, '').replace(/\s*-\s*Vietnamese.*$/i, '')}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {error && !menuOpen && (
        <div className="absolute right-0 top-full mt-2 z-30 w-64 flex items-start gap-2 text-[11px] leading-relaxed text-amber-200 bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Đóng" className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
