import { useEffect, useState } from 'react';

/**
 * Top-of-viewport scroll-progress bar.
 *
 * Renders a 2px amber bar fixed to the top of the viewport that fills
 * left-to-right as the user scrolls down a long page. Reads as a
 * subtle "you're 60% through" cue — common on long-form marketplace
 * pages where the reader needs orientation.
 *
 * Hidden on the booking flow + auth-callback + payment, where the
 * customer is mid-task and a visual progress hint would compete.
 */

const HIDE_ON: string[] = ['booking', 'auth-callback', 'payment'];

interface Props {
  currentPage: string;
}

export default function ScrollProgress({ currentPage }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (HIDE_ON.includes(currentPage)) return undefined;
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) { setPct(0); return; }
      const ratio = Math.min(1, Math.max(0, doc.scrollTop / total));
      setPct(ratio * 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentPage]);

  if (HIDE_ON.includes(currentPage)) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 h-[2px] z-40 pointer-events-none"
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="h-full bg-amber-500 transition-[width] duration-150 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
