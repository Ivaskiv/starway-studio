const clamp = (v: number, min = 0, max = 255) => Math.max(min, Math.min(max, Math.round(v)));

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '').trim();
  const safe = normalized.length === 3 ? normalized.split('').map(c => c + c).join('') : normalized;
  const int = parseInt(safe, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const mix = (
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number],
  ratio: number,
): [number, number, number] => [
  clamp(r1 + (r2 - r1) * ratio),
  clamp(g1 + (g2 - g1) * ratio),
  clamp(b1 + (b2 - b1) * ratio),
];

const rgb = (c: [number, number, number]) => `${c[0]}, ${c[1]}, ${c[2]}`;

export function buildLiquidScheme(accentHex: string) {
  const accent = hexToRgb(accentHex);
  const midnight: [number, number, number] = [4, 10, 24];
  const navy: [number, number, number] = [8, 18, 40];

  const base = mix(midnight, accent, 0.08);
  const depth = mix(navy, accent, 0.12);
  const card = mix(navy, accent, 0.2);
  const glow = mix(accent, [255, 255, 255], 0.2);

  return {
    '--liquid-base-rgb': rgb(base),
    '--liquid-depth-rgb': rgb(depth),
    '--liquid-card-rgb': rgb(card),
    '--liquid-glow-rgb': rgb(glow),
  } as const;
}
