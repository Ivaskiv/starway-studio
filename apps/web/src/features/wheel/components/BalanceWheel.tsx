import { cn } from '@/lib/utils'
import { WheelScore } from '@/features/wheel/types/wheel.types';
import React, { memo, useMemo } from 'react';

// ─────────────────────────────────────────────────────────
// Єдиний маппінг categoryId → назва + емодзі
// Ключі відповідають WHEEL_CATEGORIES (активний фронт)
// TODO: після міграції бекенду замінити на LIFE_SPHERES ключі
// ─────────────────────────────────────────────────────────
const SPHERE_META: Record<string, { label: string; emoji: string }> = {
  money:        { label: 'Фінанси',    emoji: '💰'  },
  realization:  { label: 'Реалізація', emoji: '🎯'  },
  relationships:{ label: 'Стосунки',   emoji: '❤️'  },
  energy:       { label: 'Енергія',    emoji: '⚡'  },
  freedom:      { label: 'Свобода',    emoji: '🕊️' },
  innerSupport: { label: 'Опора',      emoji: '🧘'  },
  health:       { label: "Здоров'я",   emoji: '🏥'  },
  growth:       { label: 'Розвиток',   emoji: '📚'  },
};

interface BalanceWheelProps {
  scores: WheelScore[];
  size?: number;
  interactive?: boolean;
  onCategoryClick?: (id: string) => void;
}

export const BalanceWheel: React.FC<BalanceWheelProps> = memo(
  ({ scores, size = 300, interactive = false, onCategoryClick }) => {
    const outerRadius = size * 0.42;
    const textRadius  = outerRadius + size * 0.085;
    const rings       = 5;
    const numPoints   = scores.length;
    const angleStep   = (2 * Math.PI) / numPoints;

    const avgScore = useMemo(
      () => (scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0),
      [scores],
    );

    const scoreToAccent = (score: number) => {
      const alpha = 0.34 + (Math.max(1, Math.min(10, score)) - 1) * 0.06;
      return `rgba(var(--accent-rgb),${alpha.toFixed(2)})`;
    };

    const svgPadding = size * 0.18;
    const svgSize    = size + svgPadding * 2;
    const sc         = svgSize / 2;

    const axisPoints = scores.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: sc + outerRadius * Math.cos(angle),
        y: sc + outerRadius * Math.sin(angle),
      };
    });

    const scorePoints = scores.map((s, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r     = (Math.max(1, s.score) / 10) * outerRadius;
      return {
        categoryId: s.categoryId,
        score:      s.score,
        angle,
        x: sc + r * Math.cos(angle),
        y: sc + r * Math.sin(angle),
      };
    });

    const polygonFillA  = `rgba(var(--accent-soft-rgb),0.44)`;
    const polygonFillB  = `rgba(var(--accent-rgb),0.16)`;
    const polygonStroke = `rgba(var(--accent-rgb),0.92)`;
    const gradientId    = `wheel-gradient-${size}-${Math.round(avgScore * 10)}`;
    const glowId        = `wheel-glow-${size}-${Math.round(avgScore * 10)}`;

    const uid = useMemo(() => Math.random().toString(36).slice(2, 7), []);

    const arcSpanRad = angleStep * 0.68;

    const labelArcs = scores.map((s, i) => {
      const angle      = i * angleStep - Math.PI / 2;
      const startAngle = angle - arcSpanRad / 2;
      const endAngle   = angle + arcSpanRad / 2;

      const x1 = sc + textRadius * Math.cos(startAngle);
      const y1 = sc + textRadius * Math.sin(startAngle);
      const x2 = sc + textRadius * Math.cos(endAngle);
      const y2 = sc + textRadius * Math.sin(endAngle);

      const d     = `M ${x1} ${y1} A ${textRadius} ${textRadius} 0 0 1 ${x2} ${y2}`;
      const label = SPHERE_META[s.categoryId]?.label ?? s.categoryId;

      return { id: `arc-${uid}-${i}`, d, label };
    });

    const fontSize  = Math.max(8.5, size * 0.042);
    const emojiSize = Math.max(11, size * 0.055);

    return (
      <div className="relative flex items-center justify-center">
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="overflow-visible"
        >
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
            {labelArcs.map(arc => (
              <path key={arc.id} id={arc.id} d={arc.d} fill="none" />
            ))}
          </defs>

          {/* base glow ring */}
          <circle cx={sc} cy={sc} r={outerRadius + 8} fill="none" stroke="rgba(var(--accent-rgb),0.2)" strokeWidth={1} />

          {/* concentric rings */}
          {Array.from({ length: rings }).map((_, ring) => {
            const r = (outerRadius / rings) * (ring + 1);
            return (
              <circle
                key={`ring-${ring}`}
                cx={sc} cy={sc} r={r}
                fill="none"
                stroke={ring === rings - 1 ? 'rgba(var(--accent-soft-rgb),0.44)' : 'rgba(var(--accent-rgb),0.2)'}
                strokeWidth={ring === rings - 1 ? 1.2 : 1}
              />
            );
          })}

          {/* axis lines */}
          {axisPoints.map((ap, i) => (
            <line key={`axis-${i}`} x1={sc} y1={sc} x2={ap.x} y2={ap.y} stroke="rgba(var(--accent-rgb),0.28)" strokeWidth={1} />
          ))}

          {/* outer boundary dots */}
          {axisPoints.map((ap, i) => (
            <circle key={`axis-dot-${i}`} cx={ap.x} cy={ap.y} r={2.8} fill="rgba(var(--accent-soft-rgb),0.96)" />
          ))}

          {/* data polygon */}
          <polygon
            points={scorePoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill={`url(#${gradientId})`}
            stroke={polygonStroke}
            strokeWidth={2.2}
            filter={`url(#${glowId})`}
          />

          {/* score points — емодзі на точці полігону */}
          {scorePoints.map((p, i) => {
            const c     = scoreToAccent(p.score);
            const emoji = SPHERE_META[p.categoryId]?.emoji ?? '✨';

            return (
              <g
                key={`point-${i}`}
                className={cn('wheel-point', interactive ? 'wheel-point-interactive' : 'wheel-point-default')}
                onClick={() => interactive && onCategoryClick?.(p.categoryId)}
              >
                <circle
                  cx={p.x} cy={p.y} r={15}
                  fill="rgba(var(--ambient-rgb-2),0.65)"
                  stroke={`rgba(var(--accent-rgb),${(0.28 + p.score * 0.05).toFixed(2)})`}
                  strokeWidth={1.5}
                />
                <circle cx={p.x} cy={p.y} r={8} fill={c} stroke="rgba(var(--on-accent-rgb),0.85)" strokeWidth={1.8} />
                <text
                  x={p.x} y={p.y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={emojiSize}
                  className="pointer-events-none select-none"
                >
                  {emoji}
                </text>
              </g>
            );
          })}

          {/* center orb */}
          <circle cx={sc} cy={sc} r={17} fill="rgba(var(--accent-rgb),0.24)" stroke="rgba(var(--accent-soft-rgb),0.64)" />
          <circle cx={sc} cy={sc} r={5.5} fill="rgba(var(--on-accent-rgb),0.95)" />

          {/* текст по дузі */}
          {labelArcs.map((arc, i) => (
            <text
              key={`label-${i}`}
              fontSize={fontSize}
              fontWeight={500}
              fill="rgba(255,255,255,0.7)"
              letterSpacing="0.04em"
            >
              <textPath href={`#${arc.id}`} startOffset="50%" textAnchor="middle">
                {arc.label}
              </textPath>
            </text>
          ))}

          {/* крапки-роздільники між секторами */}
          {scores.map((_, i) => {
            const angle = (i + 0.5) * angleStep - Math.PI / 2;
            return (
              <circle
                key={`sep-${i}`}
                cx={sc + textRadius * Math.cos(angle)}
                cy={sc + textRadius * Math.sin(angle)}
                r={1.8}
                fill="rgba(var(--accent-soft-rgb),0.5)"
              />
            );
          })}
        </svg>
      </div>
    );
  },
);

BalanceWheel.displayName = 'BalanceWheel';