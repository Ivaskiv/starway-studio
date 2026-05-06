import { memo } from 'react'

import { WHEEL_GUIDE_PHRASES, getWheelCategoryById } from '@/features/wheel/constants/wheelContent'
import type { WheelScore, WheelSphereId } from '@/features/wheel/types/wheel.types'

interface BalanceWheelProps {
  scores: WheelScore[]
  size?: number
  activeCategoryId?: WheelSphereId | null
}

const polar = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
})

const arcPath = (cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const innerStart = polar(cx, cy, innerRadius, startAngle)
  const outerStart = polar(cx, cy, outerRadius, startAngle)
  const outerEnd = polar(cx, cy, outerRadius, endAngle)
  const innerEnd = polar(cx, cy, innerRadius, endAngle)
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

const ringLabelOffsets = [0.24, 0.4, 0.56, 0.72] as const

export const BalanceWheel = memo(({ scores, size = 360, activeCategoryId = null }: BalanceWheelProps) => {
  const center = size / 2
  const ringCount = 10
  const outerRadius = size * 0.33
  const sectorAngle = (Math.PI * 2) / Math.max(scores.length, 1)
  const labelRadius = outerRadius + size * 0.15
  const separatorRadius = outerRadius + size * 0.08
  const guideFontSize = Math.max(12, Math.round(size * 0.036))
  const labelFontSize = Math.max(11, Math.round(size * 0.03))

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full overflow-visible" role="img" aria-label="Колесо балансу">
        <defs>
          <radialGradient id="wheelGlassGlow" cx="50%" cy="50%" r="58%">
            <stop offset="0%" stopColor="rgba(86,136,255,0.24)" />
            <stop offset="70%" stopColor="rgba(86,136,255,0.06)" />
            <stop offset="100%" stopColor="rgba(86,136,255,0)" />
          </radialGradient>
        </defs>

        <circle cx={center} cy={center} r={outerRadius + 18} fill="url(#wheelGlassGlow)" />

        {Array.from({ length: ringCount }, (_, index) => {
          const radius = ((index + 1) / ringCount) * outerRadius
          return (
            <circle
              key={`ring-${index + 1}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={index === ringCount - 1 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={1}
            />
          )
        })}

        {Array.from({ length: ringCount }, (_, index) => (
          <text
            key={`scale-${index + 1}`}
            x={center}
            y={center - ((index + 1) / ringCount) * outerRadius + 10}
            fill="rgba(255,255,255,0.34)"
            fontSize="8"
            textAnchor="middle"
          >
            {index + 1}
          </text>
        ))}

        {scores.map((score, index) => {
          const category = getWheelCategoryById(score.categoryId)
          const startAngle = index * sectorAngle - Math.PI / 2 - sectorAngle / 2
          const endAngle = startAngle + sectorAngle
          const guideAngle = startAngle + sectorAngle / 2
          const fillRadius = (Math.max(0, Math.min(10, score.score)) / ringCount) * outerRadius
          const labelPoint = polar(center, center, labelRadius, guideAngle)
          const labelRotation = (guideAngle * 180) / Math.PI + 90
          const guideRotation = (guideAngle * 180) / Math.PI + 180
          const active = activeCategoryId === score.categoryId
          const guidePhrases = WHEEL_GUIDE_PHRASES[score.categoryId] ?? []

          return (
            <g key={score.categoryId}>
              <path
                d={arcPath(center, center, 0, fillRadius, startAngle, endAngle)}
                fill={category?.color ?? '#5b7cff'}
                fillOpacity={active ? 0.28 : 0.16}
                className="transition-all duration-200"
              />
              <line
                x1={center}
                y1={center}
                x2={polar(center, center, outerRadius, startAngle).x}
                y2={polar(center, center, outerRadius, startAngle).y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              <g transform={`rotate(${guideRotation} ${center} ${center})`}>
                {ringLabelOffsets.map((offset, phraseIndex) => (
                  <text
                    key={`${score.categoryId}-${phraseIndex}`}
                    x={center}
                    y={center - outerRadius * (0.9 - offset * 0.48)}
                    fill="rgba(255,255,255,0.28)"
                    fontSize={guideFontSize}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {guidePhrases[phraseIndex] ?? ''}
                  </text>
                ))}
              </g>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                fill={active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)'}
                fontSize={labelFontSize}
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${labelRotation} ${labelPoint.x} ${labelPoint.y})`}
              >
                {category?.nameUk ?? score.categoryId}
              </text>
            </g>
          )
        })}

        {scores.map((_, index) => {
          const separatorAngle = index * sectorAngle - Math.PI / 2
          const point = polar(center, center, separatorRadius, separatorAngle)
          return (
            <circle
              key={`separator-${index}`}
              cx={point.x}
              cy={point.y}
              r={3}
              fill="rgb(92 136 255 / 0.92)"
            />
          )
        })}

        <circle cx={center} cy={center} r={6} fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
})

BalanceWheel.displayName = 'BalanceWheel'
