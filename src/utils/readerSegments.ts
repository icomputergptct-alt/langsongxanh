// Turns an article into short pieces to read aloud. Shared by the browser reader
// and the /api/tts route, so both sides agree on what segment N says. Pure
// string handling (no DOM) so it also runs on the server.

export interface ReaderSegment {
  text: string;
  /** Which on-page block this piece belongs to: 'title', 'summary' or 'p{index}'. */
  block: string;
}

export interface ReadableArticle {
  title: string;
  summary: string;
  content: string;
}

/** Browser voices: Chrome cuts long utterances off after ~15s, so keep them short. */
export const DEVICE_SEGMENT_LENGTH = 220;
/** Google voice: Google's free speech service rejects text much past ~250 characters. */
export const CLOUD_SEGMENT_LENGTH = 200;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const toPlainText = (raw: string): string =>
  raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/^\s*[+*\-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

// Split on sentence ends, then on commas/spaces for any sentence still too long.
const splitForSpeech = (text: string, maxLength: number): string[] => {
  const sentences = text.match(/[^.!?…;]+[.!?…;]*\s*/g) || [text];
  const pieces: string[] = [];
  let current = '';
  const push = (s: string) => {
    if ((current + s).length > maxLength && current) {
      pieces.push(current);
      current = '';
    }
    current += s;
  };
  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      push(sentence);
      continue;
    }
    for (const part of sentence.match(/[^,]+,?/g) || [sentence]) {
      if (part.length <= maxLength) push(part + ' ');
      else for (const word of part.split(/\s+/)) push(word + ' ');
    }
  }
  pieces.push(current);
  return pieces.map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => /[\p{L}\p{N}]/u.test(p));
};

/** Title, summary and body paragraphs (no images or code), split into readable pieces. */
export const buildReaderSegments = (article: ReadableArticle, maxLength: number): ReaderSegment[] => {
  const blocks: { block: string; text: string }[] = [
    { block: 'title', text: article.title || '' },
    { block: 'summary', text: article.summary || '' },
  ];
  (article.content || '').split('\n\n').forEach((paragraph, index) => {
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
  return blocks.flatMap(({ block, text }) => splitForSpeech(toPlainText(text), maxLength).map((t) => ({ block, text: t })));
};

/** Short stable fingerprint of a segment's text, so a cached recording always matches what's highlighted. */
export const segmentHash = (text: string): string => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

/** Voices voiced on the server (Google's free Vietnamese voice). */
export const CLOUD_VOICES = [{ id: 'google', label: 'Giọng Google' }] as const;
export type CloudVoiceId = (typeof CLOUD_VOICES)[number]['id'];
