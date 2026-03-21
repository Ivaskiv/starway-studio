import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { buildLiquidScheme } from '../utils/liquidScheme';

export function useLandingTheme() {
  const search = new URLSearchParams(window.location.search);
  const queryAccent = search.get('accent');
  const savedAccent = localStorage.getItem('starway_funnel_accent_color');
  // fix code_x: public funnel landing defaults to curated deep-blue scheme, not app orange.
  const accent = queryAccent || savedAccent || '#3b82f6';

  return useMemo(() => {
    const scheme = buildLiquidScheme(accent);
    return {
      ...scheme,
      '--liquid-accent': accent,
    } as CSSProperties;
  }, [accent]);
}
