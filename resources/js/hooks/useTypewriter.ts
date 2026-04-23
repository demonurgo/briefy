// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect, useRef, useState } from 'react';

export interface UseTypewriterOptions {
  target: string;          // full target text (may grow over time)
  charsPerFrame?: number;  // default 2
  enabled?: boolean;       // default true; when false, renders target immediately
}

const reducedMotion = typeof window !== 'undefined'
  ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  : false;

/**
 * Returns the currently-revealed substring of `target`. When the target grows,
 * the revealed portion catches up at `charsPerFrame` per rAF. Respects
 * prefers-reduced-motion (full reveal immediately when reduced).
 */
export function useTypewriter({
  target,
  charsPerFrame = 2,
  enabled = true,
}: UseTypewriterOptions): string {
  const [rendered, setRendered] = useState('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setRendered(target);
      return;
    }

    // If target shrank (reset), reset rendered to match.
    if (!target.startsWith(rendered) || target.length < rendered.length) {
      setRendered(target.length < rendered.length ? '' : rendered.slice(0, target.length));
    }

    const drain = () => {
      setRendered((prev) => {
        if (prev.length >= target.length) return prev;
        const next = target.slice(0, prev.length + charsPerFrame);
        if (next.length < target.length) {
          rafRef.current = requestAnimationFrame(drain);
        }
        return next;
      });
    };

    if (rendered.length < target.length) {
      rafRef.current = requestAnimationFrame(drain);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [target, charsPerFrame, enabled, rendered]);

  return rendered;
}
