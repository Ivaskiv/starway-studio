import { WheelScore, WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import React, { memo, useMemo } from 'react';

interface BalanceWheelProps {
  scores: WheelScore[];
  size?: number;
  interactive?: boolean;
  onCategoryClick?: (id: string) => void;
}

export const BalanceWheel: React.FC<BalanceWheelProps> = memo(
  ({ scores, size = 300, interactive = false, onCategoryClick }) => {
    const center = size / 2;
    const outerRadius = size * 0.42;
    const emojiRadius = outerRadius + 28;
    const rings = 5;
    const numPoints = scores.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const avgScore = useMemo(
      () => (scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0),
      [scores],
    );

    const categoryMeta = useMemo(
      () =>
        new Map(
          WHEEL_CATEGORIES.map((c) => [
            c.id,
            {
              emoji: c.emoji,
            },
          ]),
        ),
      [],
    );

    const scoreToAccent = (score: number) => {
      const alpha = 0.34 + (Math.max(1, Math.min(10, score)) - 1) * 0.06;
      return `rgba(var(--accent-rgb),${alpha.toFixed(2)})`;
    };

    const axisPoints = scores.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2; // початок зверху
      return {
        angle,
        x: center + outerRadius * Math.cos(angle),
        y: center + outerRadius * Math.sin(angle),
      };
    });

    const scorePoints = scores.map((s, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (s.score / 10) * outerRadius;
      return {
        categoryId: s.categoryId,
        score: s.score,
        angle,
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });

    const polygonPoints = scorePoints.map((p) => `${p.x},${p.y}`).join(' ');

    const polygonFillA = `rgba(var(--accent-soft-rgb),0.44)`;
    const polygonFillB = `rgba(var(--accent-rgb),0.16)`;
    const polygonStroke = `rgba(var(--accent-rgb),0.92)`;
    const gradientId = `wheel-gradient-${size}-${Math.round(avgScore * 10)}`;
    const glowId = `wheel-glow-${size}-${Math.round(avgScore * 10)}`;

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="45%" r="58%">
              <stop offset="0%" stopColor={polygonFillA} />
              <stop offset="100%" stopColor={polygonFillB} />
            </radialGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* base glow */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius + 8}
            fill="none"
            stroke="rgba(var(--accent-rgb),0.2)"
            strokeWidth={1}
          />

          {/* concentric rings */}
          {Array.from({ length: rings }).map((_, ring) => {
            const r = (outerRadius / rings) * (ring + 1);
            return (
              <circle
                key={`ring-${ring}`}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={ring === rings - 1 ? 'rgba(var(--accent-soft-rgb),0.44)' : 'rgba(var(--accent-rgb),0.2)'}
                strokeWidth={ring === rings - 1 ? 1.2 : 1}
              />
            );
          })}

          {/* axis lines */}
          {axisPoints.map((ap, i) => (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={ap.x}
              y2={ap.y}
              stroke="rgba(var(--accent-rgb),0.28)"
              strokeWidth={1}
            />
          ))}

          {/* tiny dots on outer boundary */}
          {axisPoints.map((ap, i) => (
            <circle key={`axis-dot-${i}`} cx={ap.x} cy={ap.y} r={2.8} fill="rgba(var(--accent-soft-rgb),0.96)" />
          ))}

          {/* data polygon */}
          <polygon
            points={polygonPoints}
            fill={`url(#${gradientId})`}
            stroke={polygonStroke}
            strokeWidth={2.2}
            filter={`url(#${glowId})`}
          />

          {/* data points */}
          {scorePoints.map((p, i) => {
            const c = scoreToAccent(p.score);
            return (
              <g
                key={`point-${i}`}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => interactive && onCategoryClick?.(p.categoryId)}
              >
                <circle cx={p.x} cy={p.y} r={7} fill={c} stroke="rgba(var(--on-accent-rgb),0.95)" strokeWidth={2} />
                <circle cx={p.x} cy={p.y} r={13} fill="none" stroke={`rgba(var(--accent-rgb),${(0.32 + p.score * 0.05).toFixed(2)})`} strokeWidth={1.6} />
              </g>
            );
          })}

          {/* center orb */}
          <circle cx={center} cy={center} r={17} fill="rgba(var(--accent-rgb),0.24)" stroke="rgba(var(--accent-soft-rgb),0.64)" />
          <circle cx={center} cy={center} r={5.5} fill="rgba(var(--on-accent-rgb),0.95)" />

          {/* emoji boundary markers */}
          {scores.map((s, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + emojiRadius * Math.cos(angle);
            const y = center + emojiRadius * Math.sin(angle);
            const category = s.categoryId;
            const emoji = categoryMeta.get(category)?.emoji ?? s.emoji ?? '✨';

            return (
              <g
                key={`emoji-${category}-${i}`}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => interactive && onCategoryClick?.(category)}
              >
                <circle cx={x} cy={y} r={16} fill="rgba(var(--ambient-rgb-2),0.72)" stroke="rgba(var(--accent-soft-rgb),0.56)" />
                <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={16}>
                  {emoji}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  },
);

BalanceWheel.displayName = 'BalanceWheel';
