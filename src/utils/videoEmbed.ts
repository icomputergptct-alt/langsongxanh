// Turns what an editor pastes into the "video" field of a news post — a plain
// link (YouTube, Facebook, TikTok, Vimeo, a direct .mp4...) or an embed code
// (<iframe ...>, <video ...>) copied from the source site — into something we
// can safely render. Embed codes are never injected as HTML: only the
// iframe/video `src` is extracted and rebuilt by our own player markup.

export type ResolvedVideo =
  | { kind: 'iframe'; src: string; vertical: boolean; provider: string }
  | { kind: 'file'; src: string };

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
      vertical: u.pathname.startsWith('/shorts/'),
      src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0${seconds > 0 ? `&start=${seconds}` : ''}`,
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'Vimeo', vertical: false, src: `https://player.vimeo.com/video/${id}` };
  }

  if (host === 'tiktok.com') {
    const id = u.pathname.match(/\/(?:video|embed(?:\/v2)?)\/(\d+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'TikTok', vertical: true, src: `https://www.tiktok.com/embed/v2/${id}` };
  }

  if (host === 'facebook.com' || host === 'fb.watch') {
    // Already a plugin URL (from Facebook's own embed code): keep it as is.
    if (u.pathname.startsWith('/plugins/video.php')) {
      return { kind: 'iframe', provider: 'Facebook', vertical: false, src: u.toString() };
    }
    const vertical = u.pathname.includes('/reel/');
    return {
      kind: 'iframe',
      provider: 'Facebook',
      vertical,
      src: `https://www.facebook.com/plugins/video.php?show_text=false&href=${encodeURIComponent(u.toString())}`,
    };
  }

  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const id = host === 'dai.ly' ? u.pathname.slice(1) : u.pathname.match(/\/(?:embed\/)?video\/([a-zA-Z0-9]+)/)?.[1];
    if (id) return { kind: 'iframe', provider: 'Dailymotion', vertical: false, src: `https://www.dailymotion.com/embed/video/${id}` };
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
    const known = resolveUrl(iframeSrc);
    if (known) return known;
    if (isHttps(iframeSrc)) {
      const w = parseInt(iframe?.getAttribute('width') || '', 10);
      const h = parseInt(iframe?.getAttribute('height') || '', 10);
      let provider = 'Video';
      try {
        provider = new URL(iframeSrc).hostname.replace(/^www\./, '');
      } catch {
        /* checked by isHttps */
      }
      return { kind: 'iframe', provider, vertical: w > 0 && h > w, src: iframeSrc };
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
