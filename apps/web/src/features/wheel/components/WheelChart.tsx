import clsx from 'clsx'
import { memo, useMemo, useState } from 'react'

import {
  WheelSphereId,
  type WheelScore,
  type WheelSphere,
} from '@/features/wheel/types/wheel.types'
import {
  analyzeWheel,
  resolveWheelSpheres,
} from '@/features/wheel/utils/wheel.utils'

type Props = {
  data?: { id: WheelSphereId; score: number; label: string }[]
  spheres?: WheelSphere[]
  scores?: WheelScore[]

  activeCategoryId?: WheelSphereId | null
  onFocusChange?: (id: WheelSphereId | null) => void

  size?: number
  className?: string
  showInsights?: boolean
}

export function WheelChart({
  data,
  spheres,
  scores,
  activeCategoryId,
  onFocusChange,
  size = 600,
  className,
  showInsights = true,
}: Props) {
  const chartData = useMemo(
    () => resolveWheelSpheres({ data, spheres, scores }),
    [data, spheres, scores]
  )

  const [hovered, setHovered] = useState<number | null>(null)

  const { strongest, weakest } = useMemo(() => analyzeWheel(chartData), [chartData])

  if (!chartData.length) {
    return null
  }

  const center = size / 2
  const radius = size * 0.32

  // --- РАДІУСИ ---
  const labelsR = radius + 20      // назви ближче до кола
  const dotsR = radius + 26        // ті ж самі (в одному кільці)
  const popupRx = radius + 140
  const popupRy = radius + 110
  const popupWidth = 224
  const popupHeight = 168

  const angleStep = (Math.PI * 2) / chartData.length

  const polar = (r: number, angle: number) => ({
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  })

  const polarOval = (rx: number, ry: number, angle: number) => ({
    x: center + rx * Math.cos(angle),
    y: center + ry * Math.sin(angle),
  })

  const clampPopupPosition = (index: number) => {
    const point = polarOval(
      popupRx,
      popupRy,
      index * angleStep - Math.PI / 2 + angleStep / 2
    )

    return {
      x: Math.min(Math.max(point.x - popupWidth / 2, 8), size - popupWidth - 8),
      y: Math.min(Math.max(point.y - popupHeight / 2, 8), size - popupHeight - 8),
    }
  }

  const sectorPath = (i: number, value: number) => {
    const start = i * angleStep - Math.PI / 2
    const end = start + angleStep

    const r = Math.max((value / 10) * radius, 12)

    const p1 = polar(r, start)
    const p2 = polar(r, end)

    return `M ${center} ${center}
      L ${p1.x} ${p1.y}
      A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}
      Z`
  }

  const arcPath = (i: number) => {
    const start = i * angleStep - Math.PI / 2 + 0.05
    const end = start + angleStep - 0.1

    const p1 = polar(labelsR, start)
    const p2 = polar(labelsR, end)

    return `M ${p1.x} ${p1.y}
            A ${labelsR} ${labelsR} 0 0 1 ${p2.x} ${p2.y}`
  }

  // --- НАЙСЛАБШІ СФЕРИ ---
  const weakestIndexes = weakest
    .map((sphere) => chartData.findIndex((item) => item.id === sphere.id))
    .filter((index) => index >= 0)

  const focusedIndex = showInsights
    ? chartData.findIndex((c) => c.id === activeCategoryId)
    : -1
  const activeIndex = showInsights ? hovered ?? focusedIndex : -1
  const popupIndex = showInsights && hovered !== null ? hovered : -1
  const activeSphere = popupIndex >= 0 ? chartData[popupIndex] : null
  const activeActions = activeSphere?.actions ?? []

  return (
    <div className={clsx('flex justify-center', className)}>
      <div className="relative overflow-visible">
        <svg width={size} height={size} className="overflow-visible">

          {/* --- СІРІ КІЛЬЦЯ --- */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((s) => (
            <circle
              key={s}
              cx={center}
              cy={center}
              r={radius * s}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
            />
          ))}

          {/* --- ЦИФРИ --- */}
          {[2, 4, 6, 8, 10].map((val) => {
            const r = (val / 10) * radius
            const p = polar(r, -Math.PI / 2)

            return (
              <text
                key={val}
                x={p.x}
                y={p.y - 4}
                textAnchor="middle"
                fontSize="16"
                fill="rgba(250, 251, 252, 0.6)"
              >
                {val}
              </text>
            )
          })}

          <defs>
            {chartData.map((_, i) => (
              <path key={i} id={`arc-${i}`} d={arcPath(i)} fill="none" />
            ))}
          </defs>

          {/* --- СЕКТОРИ --- */}
          {chartData.map((s, i) => {
            const isActive = activeIndex === i
            const isWeak = weakestIndexes.includes(i)

            return (
              <path
                key={s.id}
                d={sectorPath(i, s.score)}
                fill={s.color}
                opacity={
                  hovered == null
                    ? isWeak
                      ? 1
                      : 0.6
                    : isActive
                    ? 1
                    : 0.2
                }
                className="transition-all duration-300 cursor-pointer"
                transform={
                  isActive || (hovered == null && focusedIndex < 0 && isWeak)
                    ? `translate(${center} ${center}) scale(1.05) translate(${-center} ${-center})`
                    : undefined
                }
                onMouseEnter={() => {
                  if (!showInsights) return
                  setHovered(i)
                }}
                onMouseLeave={() => {
                  if (!showInsights) return
                  setHovered(null)
                }}
                onClick={() => {
                  if (!showInsights) return
                  onFocusChange?.(focusedIndex === i ? null : s.id)
                }}
              />
            )
          })}

          {/* --- НАЗВИ --- */}
          {chartData.map((s, i) => {
            const isActive = activeIndex === i
            const isWeak = weakestIndexes.includes(i)

            return (
              <text
                key={s.id}
                fontSize="16"
                fontWeight={isActive || (hovered == null && focusedIndex < 0 && isWeak) ? 600 : 400}
                fill={
                  isActive || (hovered == null && focusedIndex < 0 && isWeak) ? s.color : '#94a3b8'
                }
              >
                <textPath
                  href={`#arc-${i}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {s.name}
                </textPath>
              </text>
            )
          })}

          {/* --- DOTS --- */}
          {chartData.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2 + angleStep
            const p = polar(dotsR, angle)
            const next = chartData[(i + 1) % chartData.length]
            const isWeak = weakestIndexes.includes((i + 1) % chartData.length)

            return (
              <circle
                key={`dot-${i}`}
                cx={p.x}
                cy={p.y}
                r={
                  hovered == null && focusedIndex < 0 && isWeak
                    ? 4.5
                    : 3.5
                }
                fill={next.color}
                opacity={
                  hovered == null && focusedIndex < 0 && isWeak
                    ? 1
                    : 0.7
                }
              />
            )
          })}

          {showInsights && popupIndex >= 0 && chartData[popupIndex] ? (
            <foreignObject
              x={clampPopupPosition(popupIndex).x}
              y={clampPopupPosition(popupIndex).y}
              width={popupWidth}
              height={popupHeight}
              className="pointer-events-none overflow-visible"
            >
              <div className="relative z-[80] max-w-full overflow-hidden rounded-xl border border-blue-500/30 bg-[#0b1220]/90 p-3 text-center text-sm text-white shadow-xl backdrop-blur-xl transition-all duration-300">
                <div className="text-[10px] tracking-widest text-blue-400">
                  ЩО ЗРОБИТИ:
                </div>
                <div className="mt-2 space-y-1.5 text-left break-words">
                  {activeActions.slice(0, 3).map((action, index) => (
                    <div key={`${chartData[popupIndex].id}-popup-${index}`} className="text-white/88">
                      {index + 1}. {action.text}
                    </div>
                  ))}
                </div>
              </div>
            </foreignObject>
          ) : null}
        </svg>
      </div>
    </div>
  )
}

export default memo(WheelChart)
