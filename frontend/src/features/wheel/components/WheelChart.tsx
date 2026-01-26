// frontend/src/features/wheel/components/WheelChart.tsx

import { useMemo } from 'react'
import { WHEEL_CATEGORIES, type WheelScore } from '../types/wheel.types'

interface WheelChartProps {
  scores: WheelScore[] | Record<string, number>
  size?: number
  interactive?: boolean
  showEmoji?: boolean
  showLabels?: boolean
  animated?: boolean
  glowIntensity?: 'low' | 'medium' | 'high'
  onCategoryClick?: (category_id: string) => void
}

const PREMIUM_COLORS = {
  bgPrimary: '#0d1b2a',
  bgSecondary: '#1b3a4b',
  bgTertiary: '#274c5e',

  orange: '#f97316',
  orangeGlow: 'rgba(249, 115, 22, 0.6)',
  gold: '#f59e0b',

  polygonStart: 'rgba(27, 58, 75, 0.8)',
  polygonEnd: 'rgba(249, 115, 22, 0.4)',

  gridLine: 'rgba(255, 255, 255, 0.08)',
  gridLineBright: 'rgba(255, 255, 255, 0.15)',
}

export const WheelChart = ({
  scores,
  size = 280,
  interactive = false,
  showEmoji = true,
  showLabels = false,
  glowIntensity = 'medium',
  onCategoryClick,
}: WheelChartProps) => {
  const normalizedScores = useMemo(() => {
    if (Array.isArray(scores)) return scores
    return Object.entries(scores).map(([category_id, score]) => ({
      category_id,
      score: Number(score),
    }))
  }, [scores])

  const center = size / 2
  const emojiOffset = showEmoji ? 40 : 20
  const maxRadius = size / 2 - emojiOffset

  const points = useMemo(() => {
    return WHEEL_CATEGORIES.map((cat, i) => {
      const angle = (Math.PI * 2 * i) / WHEEL_CATEGORIES.length - Math.PI / 2
      const score = normalizedScores.find(s => s.category_id === cat.id)?.score ?? 0
      const radius = (score / 10) * maxRadius

      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        outerX: center + maxRadius * Math.cos(angle),
        outerY: center + maxRadius * Math.sin(angle),
        emojiX: center + (maxRadius + 28) * Math.cos(angle),
        emojiY: center + (maxRadius + 28) * Math.sin(angle),
        category: cat,
        score,
      }
    })
  }, [normalizedScores, center, maxRadius])

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ')

  const glowBlur =
    glowIntensity === 'high' ? 25 : glowIntensity === 'medium' ? 15 : 8

  const handleClick = (id: string) => {
    if (interactive && onCategoryClick) onCategoryClick(id)
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-xl"
        style={{
          background: `radial-gradient(circle, ${PREMIUM_COLORS.orangeGlow} 0%, transparent 70%)`,
        }}
      />

      <svg
        width={size}
        height={size}
        style={{ filter: `drop-shadow(0 0 ${glowBlur}px ${PREMIUM_COLORS.orangeGlow})` }}
      >
        <defs>
          <linearGradient id="polygonGradient">
            <stop offset="0%" stopColor={PREMIUM_COLORS.polygonStart} />
            <stop offset="100%" stopColor={PREMIUM_COLORS.polygonEnd} />
          </linearGradient>

          <radialGradient id="bgGradient">
            <stop offset="0%" stopColor={PREMIUM_COLORS.bgTertiary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={PREMIUM_COLORS.bgPrimary} stopOpacity="0.7" />
          </radialGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={maxRadius}
          fill="url(#bgGradient)"
          stroke={PREMIUM_COLORS.gridLine}
        />

        {[2, 4, 6, 8, 10].map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 10) * maxRadius}
            fill="none"
            stroke={level === 10 ? PREMIUM_COLORS.gridLineBright : PREMIUM_COLORS.gridLine}
            strokeDasharray={level < 10 ? '4 4' : undefined}
          />
        ))}

        {WHEEL_CATEGORIES.map((_, i) => {
          const angle = (Math.PI * 2 * i) / WHEEL_CATEGORIES.length - Math.PI / 2
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke={PREMIUM_COLORS.gridLine}
            />
          )
        })}

        <polygon
          points={polygonPoints}
          fill="url(#polygonGradient)"
          stroke={PREMIUM_COLORS.orange}
          strokeWidth={2.5}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={6}
            fill={p.category.color}
            stroke="white"
            strokeWidth={2}
            className={interactive ? 'cursor-pointer' : ''}
            onClick={() => handleClick(p.category.id)}
          />
        ))}

        {showLabels &&
          [2, 4, 6, 8, 10].map(level => (
            <text
              key={level}
              x={center + 6}
              y={center - (level / 10) * maxRadius + 4}
              fill="rgba(255,255,255,0.4)"
              fontSize="10"
            >
              {level}
            </text>
          ))}
      </svg>

      {showEmoji &&
        points.map((p, i) => (
          <div
            key={i}
            className={`absolute w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/10 ${
              interactive ? 'cursor-pointer hover:scale-110 transition' : ''
            }`}
            style={{
              left: p.emojiX - 20,
              top: p.emojiY - 20,
            }}
            onClick={() => handleClick(p.category.id)}
            title={`${p.category.nameUk}: ${p.score}/10`}
          >
            <span className="text-xl">{p.category.emoji}</span>
          </div>
        ))}
    </div>
  )
}

export default WheelChart
