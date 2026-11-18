import React from 'react';
import { resolveVideoSource, withAspect, isVideoAspect, type VideoAspect } from '../utils/videoEmbed';

// Frame size per shape: landscape fills the width, taller shapes are capped so they fit on screen.
const FRAME_CLASS: Record<VideoAspect, string> = {
  '16:9': 'w-full aspect-video',
  '4:3': 'w-full max-w-3xl aspect-[4/3]',
  '1:1': 'w-full max-w-[480px] aspect-square',
  '9:16': 'w-full max-w-[360px] aspect-[9/16]',
};

interface VideoEmbedProps {
  source: string;
  title: string;
  /** Frame shape chosen by the editor; empty = the automatic guess. */
  aspect?: string;
  className?: string;
}

/** Plays a news post's video (link or embed code) — renders nothing if it can't be resolved. */
export const VideoEmbed: React.FC<VideoEmbedProps> = ({ source, title, aspect, className = '' }) => {
  const resolved = resolveVideoSource(source);
  if (!resolved) return null;
  const video = isVideoAspect(aspect) ? withAspect(resolved, aspect) : resolved;

  if (video.kind === 'file') {
    return (
      <div className={`rounded-xl overflow-hidden border border-slate-800 bg-black ${className}`}>
        <video src={video.src} controls playsInline preload="metadata" className="w-full max-h-[70vh] bg-black" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border border-slate-800 bg-black mx-auto ${
        FRAME_CLASS[video.aspect]
      } ${className}`}
    >
      <iframe
        src={video.src}
        title={title}
        className="w-full h-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        // Third-party players need scripts + their own origin, but can't navigate our page.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
};
