import { useEffect, useRef, useState } from 'react';

/**
 * <AnimatedNumber> — counts a value up from 0 → target as soon as it
 * scrolls into view, then stays at target. Used on home + country
 * stats blocks ("27,000+ moves", "5,400+ providers", "$50k").
 *
 * Pass `value` as a number; the formatter converts it to the on-screen
 * string. The default formatter rounds to integer with localised
 * thousands separators; pass `format` for custom output ("$50k").
 *
 * Honours prefers-reduced-motion: shows the final value immediately
 * for users who have asked the OS to suppress motion.
 */
export default function AnimatedNumber({
  value,
  duration = 1400,
  format,
  className = '',
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setShown(value);
      started.current = true;
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              /* easeOutCubic — fast in, gentle settle */
              const eased = 1 - Math.pow(1 - t, 3);
              setShown(value * eased);
              if (t < 1) requestAnimationFrame(tick);
              else setShown(value);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, duration]);

  const display = format ? format(shown) : Math.round(shown).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
