// Turns what an editor pastes into the "video" field of a news post — a plain
// link (YouTube, Facebook, TikTok, Vimeo, a direct .mp4...) or an embed code
// (<iframe ...>, <video ...>) copied from the source site — into something we
// can safely render. Embed codes are never injected as HTML: only the
// iframe/video `src` is extracted and rebuilt by our own player markup.

// Frame shapes a player can be shown in. Embedded players can't tell us the
// video's real shape, so `aspect` is a best guess the editor can override.
export const VIDEO_ASPECTS = ['16:9', '9:16', '1:1', '4:3'] as const;
export type VideoAspect = (typeof VIDEO_ASPECTS)[number];

export type ResolvedVideo =
  | { kind: 'iframe'; src: string; aspect: VideoAspect; provider: string }
  | { kind: 'file'; src: string };

export const isVideoAspect = (v: unknown): v is VideoAspect =>
  typeof v === 'string' && (VIDEO_ASPECTS as readonly string[]).includes(v);

// The listed shape closest to a width x height pair.
const nearestAspect = (w: number, h: number): VideoAspect | null => {
  if (!(w > 0 && h > 0)) return null;
  const ratio = w / h;
  const values: Record<VideoAspect, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:3': 4 / 3 };
  return VIDEO_ASPECTS.reduce((best, a) =>
    Math.abs(Math.log(values[a] / ratio)) < Math.abs(Math.log(values[best] / ratio)) ? a : best
  );
};

const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const youTubeId = (u: URL): string | null => {
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') return /^\/[\w-]{11}/.test(u.pathname) ? u.pathname.slice(1, 12) : null;
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  const v = u.searchParams.get('v');
  if (v && /^[\w-]{11}$/.test(v)) return v;
  return u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] || null;
};

const isDirectFile = (url: string) => /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url);

function resolveUrl(raw: string): ResolvedVideo | null {
  let u: URL;
  try {
    u = new URL(raw.trim().replace(/^\/\//, 'https://'));
  } catch {
    return null;
  }
  if (u.protocol === 'http:') u.protocol = 'https:';
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www|m|web|mbasic)\./, '');

  const yt = youTubeId(u);
  if (yt) {
    const start = u.searchParams.get('t') || u.searchParams.get('start');
    const seconds = start ? parseInt(start, 10) : 0;
    return {
      kind: 'iframe',
      provider: 'YouTube',
      aspect: u.pathname.startsWith('/shorts/') ? '9:16' : '16:9',
      src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0${seconds > 0 ? `&start=${seconds}` : ''}`,
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'Vimeo', aspect: '16:9', src: `https://player.vimeo.com/video/${id}` };
  }

  if (host === 'tiktok.com') {
    const id = u.pathname.match(/\/(?:video|embed(?:\/v2)?)\/(\d+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'TikTok', aspect: '9:16', src: `https://www.tiktok.com/embed/v2/${id}` };
  }

  if (host === 'facebook.com' || host === 'fb.watch') {
    // A plugin URL (from Facebook's own embed code) carries the video link in href.
    const isPlugin = u.pathname.startsWith('/plugins/video.php');
    const href = isPlugin ? u.searchParams.get('href') || '' : u.toString();
    // Reels are vertical, even though Facebook's embed code sizes them 560x309 —
    // in a landscape frame the player crops the top and bottom off.
    const aspect: VideoAspect = href.includes('/reel/') ? '9:16' : '16:9';
    const player = new URL('https://www.facebook.com/plugins/video.php');
    player.searchParams.set('href', href);
    player.searchParams.set('show_text', 'false');
    return withAspect({ kind: 'iframe', provider: 'Facebook', aspect, src: player.toString() }, aspect);
  }

  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const id = host === 'dai.ly' ? u.pathname.slice(1) : u.pathname.match(/\/(?:embed\/)?video\/([a-zA-Z0-9]+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'Dailymotion', aspect: '16:9', src: `https://www.dailymotion.com/embed/video/${id}` };
  }

  if (isDirectFile(u.toString())) return { kind: 'file', src: u.toString() };
  return null;
}

// Pulls the playable src out of a pasted embed code.
function resolveEmbedCode(html: string): ResolvedVideo | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const iframe = doc.querySelector('iframe');
  const iframeSrc = iframe?.getAttribute('src')?.trim().replace(/^\/\//, 'https://');
  if (iframeSrc) {
    // Known providers get normalised (e.g. YouTube -> nocookie); any other
    // https player (VTV, báo điện tử...) is shown as-is inside a sandboxed iframe.
    // The embed code's own width/height hint at the video's shape — except
    // Facebook's, which sizes every video (reels too) 560x309.
    const fromSize = nearestAspect(
      parseInt(iframe?.getAttribute('width') || '', 10),
      parseInt(iframe?.getAttribute('height') || '', 10)
    );
    const known = resolveUrl(iframeSrc);
    if (known) {
      return known.kind === 'iframe' && known.provider !== 'Facebook' && fromSize && known.aspect === '16:9'
        ? { ...known, aspect: fromSize }
        : known;
    }
    if (isHttps(iframeSrc)) {
      let provider = 'Video';
      try {
        provider = new URL(iframeSrc).hostname.replace(/^www\./, '');
      } catch {
        /* checked by isHttps */
      }
      return { kind: 'iframe', provider, aspect: fromSize || '16:9', src: iframeSrc };
    }
  }

  const video = doc.querySelector('video');
  const videoSrc = (video?.getAttribute('src') || video?.querySelector('source')?.getAttribute('src') || '').trim();
  if (videoSrc && isHttps(videoSrc.replace(/^\/\//, 'https://'))) {
    return { kind: 'file', src: videoSrc.replace(/^\/\//, 'https://') };
  }

  // Some embed codes (TikTok's <blockquote cite="...">, Facebook's div data-href) carry the link instead.
  const linked = doc.querySelector('[cite], [data-href]');
  const link = linked?.getAttribute('cite') || linked?.getAttribute('data-href');
  return link ? resolveUrl(link) : null;
}

// Shows the player in another frame shape (Facebook's plugin also lays itself
// out from width/height parameters, so those follow the shape).
export function withAspect(video: ResolvedVideo, aspect: VideoAspect): ResolvedVideo {
  if (video.kind !== 'iframe') return video;
  let src = video.src;
  if (video.provider === 'Facebook') {
    const u = new URL(src);
    const [w, h] = { '16:9': [560, 315], '9:16': [360, 640], '1:1': [500, 500], '4:3': [560, 420] }[aspect];
    u.searchParams.set('width', String(w));
    u.searchParams.set('height', String(h));
    src = u.toString();
  }
  return { ...video, aspect, src };
}

export function resolveVideoSource(source?: string | null): ResolvedVideo | null {
  const s = (source || '').trim();
  if (!s) return null;
  return s.startsWith('<') ? resolveEmbedCode(s) : resolveUrl(s);
}

// A thumbnail we can derive without any network call (YouTube only).
export function videoThumbnail(source?: string | null): string | null {
  const v = resolveVideoSource(source);
  const id = v?.kind === 'iframe' ? v.src.match(/youtube-nocookie\.com\/embed\/([\w-]{11})/)?.[1] : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

// The public page of a non-YouTube video, whose preview image the server can
// read (/api/video-thumbnail). For Facebook embeds that's the plugin's href.
export function videoPageUrl(source?: string | null): string | null {
  const v = resolveVideoSource(source);
  if (!v || v.kind !== 'iframe' || v.provider === 'YouTube') return null;
  try {
    const u = new URL(v.src);
    if (u.pathname.startsWith('/plugins/video.php')) return u.searchParams.get('href');
    const tiktok = u.pathname.match(/^\/embed\/v2\/(\d+)/)?.[1];
    if (tiktok) return `https://www.tiktok.com/@/video/${tiktok}`;
    const vimeo = u.hostname === 'player.vimeo.com' ? u.pathname.match(/\/video\/(\d+)/)?.[1] : null;
    if (vimeo) return `https://vimeo.com/${vimeo}`;
    const dm = u.pathname.match(/^\/embed\/video\/(\w+)/)?.[1];
    if (dm) return `https://www.dailymotion.com/video/${dm}`;
  } catch {
    /* resolved src is always a valid URL */
  }
  return null;
}
