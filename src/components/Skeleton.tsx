import React, { useEffect, useState } from 'react';
import type { Theme } from '../theme/themes';

// Relative luminance of a #rrggbb color, 0 (black) to 1 (white).
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Shimmer block + highlight sweep, picked to read on the current theme's background.
export function skeletonColors(theme: Theme): { base: string; highlight: string } {
  return luminance(theme.bg) < 0.5
    ? { base: '#1f2937', highlight: '#334155' }  // dark
    : { base: '#e2e8f0', highlight: '#f5f8fc' }; // light
}

interface SkeletonProps {
  theme: Theme;
  width?: number | string;
  height?: number | string;
  radius?: number;
  circle?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({ theme, width = '100%', height = 16, radius = 6, circle, style }: SkeletonProps) {
  const { base, highlight } = skeletonColors(theme);
  return (
    <span
      aria-hidden="true"
      className="skeleton"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: circle ? '50%' : radius,
        flexShrink: 0,
        '--skeleton-base': base,
        '--skeleton-highlight': highlight,
        ...style,
      } as React.CSSProperties}
    />
  );
}

// Resolves once web fonts are ready and the skeleton has had one frame to paint.
// Keeps the placeholder honest: it shows until the page can actually render without
// a font swap, then reveals. On warm loads this is a quick flash; on cold loads it holds.
export function usePageReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const reveal = () => {
      raf = requestAnimationFrame(() => { if (!cancelled) setReady(true); });
    };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(reveal).catch(reveal);
    } else {
      reveal();
    }
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, []);

  return ready;
}
