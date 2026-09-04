import React, { useMemo } from 'react';

interface FirefliesProps {
  count?: number;
  className?: string;
  /** Dot diameter in px (default 3, matching the .firefly CSS default). */
  size?: number;
  /** Palette each dot picks a random color from (default: yellow only). */
  colors?: string[];
}

const DEFAULT_COLORS = ['253, 224, 71']; // #fde047, as an rgb triplet for box-shadow

// Decorative layer of small glowing dots that drift and flicker like fireflies.
// Positions/timings are randomized once per mount (not per render) so the
// swarm doesn't jump around on re-renders.
export const Fireflies: React.FC<FirefliesProps> = ({ count = 12, className = '', size = 3, colors }) => {
  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS;

  const flies = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        floatDuration: 6 + Math.random() * 6,
        glowDuration: 2 + Math.random() * 3,
        delay: Math.random() * 5,
        color: palette[Math.floor(Math.random() * palette.length)],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  const scale = size / 3;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {flies.map((fly) => (
        <span
          key={fly.id}
          className="firefly"
          style={{
            left: `${fly.left}%`,
            top: `${fly.top}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: `rgb(${fly.color})`,
            boxShadow: `0 0 ${4 * scale}px ${1 * scale}px rgba(${fly.color}, 0.9), 0 0 ${10 * scale}px ${3 * scale}px rgba(${fly.color}, 0.5)`,
            animationDuration: `${fly.floatDuration}s, ${fly.glowDuration}s`,
            animationDelay: `${fly.delay}s, ${fly.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
