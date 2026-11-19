import React, { useEffect, useRef, useState } from 'react';
import { Headphones, Play, Pause, Square, SkipBack, SkipForward, AlertTriangle } from 'lucide-react';

/** One piece of the article to read aloud, tagged with the block it belongs to (for highlighting). */
export interface ReaderSegment {
  text: string;
  block: string;
}

interface ArticleReaderProps {
  segments: ReaderSegment[];
  /** Called with the block being read, or null once reading stops. */
  onActiveBlockChange: (block: string | null) => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75];
const RATE_KEY = 'lhs-tts-rate';
const VOICE_KEY = 'lhs-tts-voice';

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

const getVietnameseVoices = (): SpeechSynthesisVoice[] =>
  window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('vi'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));

/** Reads the article aloud in Vietnamese with the browser's speech engine, one segment at a time. */
export const ArticleReader: React.FC<ArticleReaderProps> = ({ segments, onActiveBlockChange }) => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(() => {
    const stored = Number(readStored(RATE_KEY));
    return RATES.includes(stored) ? stored : 1;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(() => readStored(VOICE_KEY));

  // Each speak/stop bumps the session, so callbacks from a cancelled utterance are ignored.
  const sessionRef = useRef(0);
  const rateRef = useRef(rate);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  rateRef.current = rate;
  voiceRef.current = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0] ?? null;

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      setVoices(getVietnameseVoices());
      if (window.speechSynthesis.getVoices().length > 0) setVoicesLoaded(true);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    // Some browsers never fire voiceschanged when there's nothing new; stop waiting after a moment.
    const timer = setTimeout(() => setVoicesLoaded(true), 1500);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      clearTimeout(timer);
    };
  }, [supported]);

  // Stop talking when the reader leaves the article.
  useEffect(
    () => () => {
      sessionRef.current++;
      if (supported) window.speechSynthesis.cancel();
    },
    [supported]
  );

  const speakFrom = (start: number) => {
    if (!supported) return;
    const session = ++sessionRef.current;
    window.speechSynthesis.cancel();
    if (start >= segments.length) {
      setStatus('idle');
      setIndex(0);
      onActiveBlockChange(null);
      return;
    }
    const i = Math.max(0, start);
    setIndex(i);
    setStatus('playing');
    onActiveBlockChange(segments[i].block);

    const utterance = new SpeechSynthesisUtterance(segments[i].text);
    utterance.lang = 'vi-VN';
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = rateRef.current;
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

  // Pausing cancels and remembers the segment: speechSynthesis.pause() is unreliable
  // (Chrome drops online voices on resume), so resuming restarts the current segment.
  const pause = () => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    setStatus('paused');
  };

  const stop = () => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setIndex(0);
    onActiveBlockChange(null);
  };

  const changeRate = (value: number) => {
    setRate(value);
    rateRef.current = value;
    writeStored(RATE_KEY, String(value));
    if (status === 'playing') speakFrom(index);
  };

  const changeVoice = (uri: string) => {
    setVoiceURI(uri);
    voiceRef.current = voices.find((v) => v.voiceURI === uri) ?? null;
    writeStored(VOICE_KEY, uri);
    if (status === 'playing') speakFrom(index);
  };

  if (!supported || segments.length === 0) return null;

  const progress = status === 'idle' ? 0 : ((index + (status === 'playing' ? 0.5 : 0)) / segments.length) * 100;
  const noVietnameseVoice = voicesLoaded && voices.length === 0;

  return (
    <div
      data-print-hide
      className="mb-8 p-4 sm:p-5 bg-gradient-to-br from-blue-950/70 via-slate-900 to-emerald-950/60 border border-emerald-500/30 rounded-xl text-slate-200"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (status === 'playing' ? pause() : speakFrom(status === 'paused' ? index : 0))}
          aria-label={status === 'playing' ? 'Tạm dừng' : 'Nghe đọc bài viết'}
          className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-colors"
        >
          {status === 'playing' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-[140px]">
          <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
            <Headphones className="w-4 h-4" />
            <span>
              {status === 'playing' ? 'Đang đọc bài viết…' : status === 'paused' ? 'Đã tạm dừng' : 'Nghe đọc bài viết'}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden cursor-pointer"
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
          <p className="mt-1 text-[11px] text-slate-400">
            {status === 'idle' ? `${segments.length} đoạn` : `Đoạn ${index + 1}/${segments.length}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => speakFrom(Math.max(0, index - 1))}
            disabled={status === 'idle'}
            aria-label="Đoạn trước"
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => speakFrom(index + 1)}
            disabled={status === 'idle'}
            aria-label="Đoạn sau"
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={status === 'idle'}
            aria-label="Dừng đọc"
            className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            aria-label="Tốc độ đọc"
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
          {voices.length > 1 && (
            <select
              value={voiceRef.current?.voiceURI ?? ''}
              onChange={(e) => changeVoice(e.target.value)}
              aria-label="Giọng đọc"
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 max-w-[180px]"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name.replace(/^Microsoft\s+/, '').replace(/\s*-\s*Vietnamese.*$/i, '')}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {noVietnameseVoice && (
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Trình duyệt này chưa có giọng đọc tiếng Việt nên giọng có thể không chuẩn. Để nghe rõ nhất, hãy mở trang bằng
            Microsoft Edge, Chrome trên Android hoặc Safari trên iPhone/Mac — hoặc cài giọng tiếng Việt trong Windows
            (Cài đặt → Thời gian &amp; ngôn ngữ → Giọng nói).
          </span>
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Turning the article into speakable segments
// ---------------------------------------------------------------------------

const MAX_SEGMENT = 220; // Chrome cuts long utterances off after ~15s, so keep pieces short.

const toPlainText = (raw: string): string => {
  const withoutMarkdown = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ');
  // DOMParser never runs scripts; it's only used to drop tags and decode entities.
  const text = new DOMParser().parseFromString(withoutMarkdown, 'text/html').body.textContent || '';
  return text.replace(/^\s*[+*\-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
};

// Split on sentence ends, then on commas/spaces for any sentence still too long.
const splitForSpeech = (text: string): string[] => {
  const sentences = text.match(/[^.!?…;]+[.!?…;]*\s*/g) || [text];
  const pieces: string[] = [];
  let current = '';
  const push = (s: string) => {
    if ((current + s).length > MAX_SEGMENT && current) {
      pieces.push(current.trim());
      current = '';
    }
    current += s;
  };
  for (const sentence of sentences) {
    if (sentence.length <= MAX_SEGMENT) {
      push(sentence);
      continue;
    }
    for (const part of sentence.match(/[^,]+,?/g) || [sentence]) {
      if (part.length <= MAX_SEGMENT) {
        push(part + ' ');
      } else {
        for (const word of part.split(/\s+/)) push(word + ' ');
      }
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.map((p) => p.replace(/\s+/g, ' ')).filter((p) => /[\p{L}\p{N}]/u.test(p));
};

/** Title, summary and body paragraphs (no images or code) as segments for the reader. */
export const buildReaderSegments = (article: { title: string; summary: string; content: string }): ReaderSegment[] => {
  const blocks: { block: string; text: string }[] = [
    { block: 'title', text: article.title },
    { block: 'summary', text: article.summary },
  ];
  article.content.split('\n\n').forEach((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (!trimmed || trimmed.startsWith('```') || /^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return;
    let text = trimmed;
    if (text.startsWith('### ')) text = text.slice(4);
    // List items each become their own sentence.
    else if (/^([*\-]|\d+\.)\s+/.test(text))
      text = text
        .split('\n')
        .map((line) => line.replace(/^([*\-]|\d+\.)\s+/, '').replace(/[.!?…;:]?\s*$/, '.'))
        .join(' ');
    blocks.push({ block: `p${index}`, text });
  });
  return blocks.flatMap(({ block, text }) => splitForSpeech(toPlainText(text)).map((t) => ({ block, text: t })));
};
