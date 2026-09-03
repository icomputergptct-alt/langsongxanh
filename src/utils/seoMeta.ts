// Client-side <title>/meta updates for SPA routes that don't have their own
// server-rendered HTML (e.g. /cong-cu/{slug} tool pages). Captures the
// original tags from index.html on load so they can be restored when the
// user navigates back to a route with no dedicated meta of its own.

const SITE_URL = 'https://www.longhoaso.com';

function getMetaTag(selector: string): HTMLMetaElement | null {
  return document.querySelector(selector);
}

function getCanonicalLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="canonical"]');
}

const DEFAULT_TITLE = document.title;
const DEFAULT_DESCRIPTION = getMetaTag('meta[name="description"]')?.content ?? '';
const DEFAULT_OG_TITLE = getMetaTag('meta[property="og:title"]')?.content ?? DEFAULT_TITLE;
const DEFAULT_OG_DESCRIPTION = getMetaTag('meta[property="og:description"]')?.content ?? DEFAULT_DESCRIPTION;
const DEFAULT_OG_URL = getMetaTag('meta[property="og:url"]')?.content ?? `${SITE_URL}/`;
const DEFAULT_CANONICAL = getCanonicalLink()?.href ?? `${SITE_URL}/`;

export function setPageMeta(title: string, description: string, path: string) {
  document.title = title;
  const url = `${SITE_URL}${path}`;

  const description_ = description || DEFAULT_DESCRIPTION;

  const desc = getMetaTag('meta[name="description"]');
  if (desc) desc.content = description_;

  const ogTitle = getMetaTag('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = title;

  const ogDesc = getMetaTag('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = description_;

  const ogUrl = getMetaTag('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = url;

  const twTitle = getMetaTag('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = title;

  const twDesc = getMetaTag('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = description_;

  const canonical = getCanonicalLink();
  if (canonical) canonical.href = url;
}

export function resetPageMeta() {
  document.title = DEFAULT_TITLE;

  const desc = getMetaTag('meta[name="description"]');
  if (desc) desc.content = DEFAULT_DESCRIPTION;

  const ogTitle = getMetaTag('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = DEFAULT_OG_TITLE;

  const ogDesc = getMetaTag('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = DEFAULT_OG_DESCRIPTION;

  const ogUrl = getMetaTag('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = DEFAULT_OG_URL;

  const canonical = getCanonicalLink();
  if (canonical) canonical.href = DEFAULT_CANONICAL;
}
