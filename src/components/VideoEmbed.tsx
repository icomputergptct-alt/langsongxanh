import React from 'react';
import { resolveVideoSource } from '../utils/videoEmbed';

interface VideoEmbedProps {
  source: string;
  title: string;
  className?: string;
}

/** Plays a news post's video (link or embed code) — renders nothing if it can't be resolved. */
export const VideoEmbed: React.FC<VideoEmbedProps> = ({ source, title, className = '' }) => {
  const video = resolveVideoSource(source);
  if (!video) return null;

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
        video.vertical ? 'max-w-[360px] aspect-[9/16]' : 'w-full aspect-video'
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
