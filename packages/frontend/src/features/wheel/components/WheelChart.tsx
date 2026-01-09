// frontend/src/features/wheel/components/WheelChart.tsx
// features/wheel/components/WheelChart.tsx

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { WHEEL_CATEGORIES, type WheelScore } from '../types/wheel.types'

interface WheelChartProps {
  scores: WheelScore[]
  size?: number
  animated?: boolean
  interactive?: boolean
  onCategoryClick?: (categoryId: string) => void
}

export const WheelChart = ({
  scores,
  size = 300,
  animated = true,
  interactive = false,
  onCategoryClick,
}: WheelChartProps) => {
  const center = size / 2
  const maxRadius = (size / 2) - 30

  const getScoreRadius = (score: number) => (score / 10) * maxRadius
  
  const getPoint = (index: number, radius: number) => {
    const angle = (index * 360 / 8 - 90) * (Math.PI / 180)
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  }

  const pathData = useMemo(() => {
    if (scores.length === 0) return ''
    
    const points = WHEEL_CATEGORIES.map((cat, i) => {
      const score = scores.find((s) => s.categoryId === cat.id)?.score || 0
      return getPoint(i, getScoreRadius(score))
    })
    
    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z'
  }, [scores, center, maxRadius])

  return (
    <svg width={size} height={size} className="drop-shadow-2xl">
      {/* Background circles */}
      {[2, 4, 6, 8, 10].map((level) => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={getScoreRadius(level)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}
      
      {/* Category lines */}
      {WHEEL_CATEGORIES.map((cat, i) => {
        const point = getPoint(i, maxRadius)
        return (
          <line
            key={cat.id}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        )
      })}
      
      {/* Score area */}
      {scores.length > 0 && (
        <motion.path
          d={pathData}
          fill="url(#wheelGradient)"
          fillOpacity="0.6"
          stroke="url(#wheelStroke)"
          strokeWidth="2"
          initial={animated ? { scale: 0, opacity: 0 } : undefined}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
      
      {/* Score points & labels */}
      {WHEEL_CATEGORIES.map((cat, i) => {
        const score = scores.find((s) => s.categoryId === cat.id)?.score || 0
        const point = getPoint(i, getScoreRadius(score))
        const labelPoint = getPoint(i, maxRadius + 20)
        
        return (
          <g 
            key={cat.id}
            className={interactive ? 'cursor-pointer' : ''}
            onClick={() => interactive && onCategoryClick?.(cat.id)}
          >
            {/* Point */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={cat.color}
              stroke="white"
              strokeWidth="2"
              initial={animated ? { scale: 0 } : undefined}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={interactive ? { scale: 1.3 } : undefined}
            />
            
            {/* Label */}
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-base select-none"
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              {cat.icon}
            </text>
          </g>
        )
      })}
      
      {/* Gradients */}
      <defs>
        <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="wheelStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
    </svg>
  )
}