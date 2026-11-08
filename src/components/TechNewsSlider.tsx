import { useEffect, useState, type ReactNode } from 'react';

interface TechNewsSliderProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Pause between slides, in ms. */
  interval?: number;
}

const SLIDE_MS = 700;

/**
 * Steps one card at a time from left to right, pausing between moves.
 * The list is rendered twice; we start on the second copy and step back
 * toward 0, then jump (without animation) to the identical second copy,
 * so the loop is seamless. Pauses while hovered/focused.
 */
export default function TechNewsSlider<T>({ items, getKey, renderItem, interval = 3000 }: TechNewsSliderProps<T>) {
  const n = items.length;
  const [index, setIndex] = useState(n);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setAnimate(false);
    setIndex(n);
  }, [n]);

  useEffect(() => {
    if (paused || n === 0) return;
    const id = window.setTimeout(() => {
      setAnimate(true);
      setIndex((i) => i - 1);
    }, interval);
    return () => window.clearTimeout(id);
  }, [index, paused, n, interval]);

  const handleTransitionEnd = () => {
    if (index <= 0) {
      setAnimate(false);
      setIndex(n);
    }
  };

  return (
    <div
      className="tech-marquee"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="tech-marquee-track"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(calc(-1 * ${index} * var(--tech-item-w)))`,
          transition: animate ? `transform ${SLIDE_MS}ms ease-in-out` : 'none',
        }}
      >
        {[0, 1].map((copy) =>
          items.map((item) => (
            <div
              key={`${copy}-${getKey(item)}`}
              className="tech-marquee-item"
              aria-hidden={copy === 1 ? true : undefined}
            >
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
