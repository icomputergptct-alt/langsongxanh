import React, { useEffect, useRef } from 'react';

interface DragonFirefliesProps {
  fireflyCount?: number;
  dragonCount?: number;
  /** Firefly color palette as "r, g, b" strings. */
  colors?: string[];
  className?: string;
}

interface Firefly {
  x: number;
  y: number;
  angle: number;
  speed: number;
  r: number;
  color: string;
  twinklePhase: number;
  twinkleSpeed: number;
  state: 'alive' | 'eaten' | 'hidden';
  eatenAt: number;
  respawnAt: number;
}

interface Dragon {
  segments: { x: number; y: number }[];
  angle: number;
  targetX: number;
  targetY: number;
  nextTargetAt: number;
  speed: number;
  hue: string; // "r, g, b" body color
  mouthFlash: number; // 0..1, decays after eating — brightens the head briefly
}

const SEGMENT_SPACING = 9;
const DRAGON_LENGTH = 16;
const EAT_RADIUS = 20;
const DRAGON_HUES = ['244, 180, 60', '250, 100, 80', '120, 210, 170'];

// Canvas-based decorative background: a swarm of drifting, twinkling fireflies
// hunted by a couple of small serpentine dragons. Runs entirely in a JS/canvas
// loop (rather than CSS animations) because "eating" needs real per-frame
// position + collision tracking between the two.
export const DragonFireflies: React.FC<DragonFirefliesProps> = ({
  fireflyCount = 50,
  dragonCount = 2,
  colors = ['253, 224, 71'],
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const randomPoint = (margin = 40) => ({
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
    });

    const spawnFirefly = (): Firefly => {
      const p = randomPoint(10);
      return {
        x: p.x,
        y: p.y,
        angle: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.25,
        r: 1.8 + Math.random() * 1.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        // Full flicker cycle every ~2-5s (matches the original CSS firefly-glow pacing).
        twinkleSpeed: 0.0012 + Math.random() * 0.0018,
        state: 'alive',
        eatenAt: 0,
        respawnAt: 0,
      };
    };

    const spawnDragon = (i: number): Dragon => {
      const start = randomPoint(80);
      const target = randomPoint(80);
      return {
        segments: Array.from({ length: DRAGON_LENGTH }).map(() => ({ ...start })),
        angle: Math.random() * Math.PI * 2,
        targetX: target.x,
        targetY: target.y,
        nextTargetAt: 0,
        speed: 0.9 + Math.random() * 0.4,
        hue: DRAGON_HUES[i % DRAGON_HUES.length],
        mouthFlash: 0,
      };
    };

    const fireflies: Firefly[] = Array.from({ length: fireflyCount }).map(spawnFirefly);
    const dragons: Dragon[] = Array.from({ length: dragonCount }).map((_, i) => spawnDragon(i));

    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      ctx.clearRect(0, 0, width, height);

      // --- fireflies: wander, twinkle, and handle the eaten -> respawn cycle ---
      for (const f of fireflies) {
        if (f.state === 'hidden') {
          if (now >= f.respawnAt) {
            const p = randomPoint(10);
            f.x = p.x;
            f.y = p.y;
            f.angle = Math.random() * Math.PI * 2;
            f.state = 'alive';
          }
          continue;
        }

        if (f.state === 'alive') {
          f.angle += (Math.random() - 0.5) * 0.15;
          f.x += Math.cos(f.angle) * f.speed * (dt / 16);
          f.y += Math.sin(f.angle) * f.speed * (dt / 16);
          if (f.x < 0) f.x = width;
          if (f.x > width) f.x = 0;
          if (f.y < 0) f.y = height;
          if (f.y > height) f.y = 0;
        }

        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * f.twinkleSpeed + f.twinklePhase));
        let alpha = twinkle;
        let radius = f.r;
        if (f.state === 'eaten') {
          const t = (now - f.eatenAt) / 260;
          if (t >= 1) {
            f.state = 'hidden';
            f.respawnAt = now + 2000 + Math.random() * 4000;
          } else {
            radius = f.r * (1 + t * 1.8);
            alpha = twinkle * (1 - t);
          }
        }

        ctx.beginPath();
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius * 4);
        glow.addColorStop(0, `rgba(${f.color}, ${alpha})`);
        glow.addColorStop(1, `rgba(${f.color}, 0)`);
        ctx.fillStyle = glow;
        ctx.arc(f.x, f.y, radius * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${f.color}, ${Math.min(1, alpha + 0.2)})`;
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- dragons: steer toward a wandering target, chain-follow the body, eat nearby fireflies ---
      for (const d of dragons) {
        if (now >= d.nextTargetAt) {
          const t = randomPoint(60);
          d.targetX = t.x;
          d.targetY = t.y;
          d.nextTargetAt = now + 4000 + Math.random() * 5000;
        }

        const head = d.segments[0];
        const desiredAngle = Math.atan2(d.targetY - head.y, d.targetX - head.x);
        let diff = desiredAngle - d.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        d.angle += diff * 0.02 * (dt / 16);

        head.x += Math.cos(d.angle) * d.speed * (dt / 16);
        head.y += Math.sin(d.angle) * d.speed * (dt / 16);

        for (let i = 1; i < d.segments.length; i++) {
          const prev = d.segments[i - 1];
          const cur = d.segments[i];
          const sdx = prev.x - cur.x;
          const sdy = prev.y - cur.y;
          const dist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
          const excess = dist - SEGMENT_SPACING;
          if (excess > 0) {
            cur.x += (sdx / dist) * excess;
            cur.y += (sdy / dist) * excess;
          }
        }

        for (const f of fireflies) {
          if (f.state !== 'alive') continue;
          const ddx = f.x - head.x;
          const ddy = f.y - head.y;
          if (ddx * ddx + ddy * ddy < EAT_RADIUS * EAT_RADIUS) {
            f.state = 'eaten';
            f.eatenAt = now;
            d.mouthFlash = 1;
          }
        }
        if (d.mouthFlash > 0) d.mouthFlash = Math.max(0, d.mouthFlash - dt / 200);

        // Tapering body: overlapping circles, tail (thin) to head (thick).
        for (let i = d.segments.length - 1; i >= 0; i--) {
          const seg = d.segments[i];
          const t = 1 - i / (d.segments.length - 1);
          const radius = 1.5 + t * 6.5;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${d.hue}, ${0.1 + t * 0.28})`;
          ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Head: a round dot that brightens briefly right after a bite.
        ctx.beginPath();
        ctx.fillStyle = `rgba(${d.hue}, ${0.45 + d.mouthFlash * 0.4})`;
        ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // Palette/counts are only meant to seed the swarm at mount, not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireflyCount, dragonCount]);

  return <canvas ref={canvasRef} className={`block ${className}`} aria-hidden="true" />;
};
