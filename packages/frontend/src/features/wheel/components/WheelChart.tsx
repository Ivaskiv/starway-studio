// packages/frontend/src/features/wheel/components/WheelChart.tsx

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { WHEEL_CATEGORIES, type WheelScore } from '../types/wheel.types'

interface WheelChartProps {
  scores: WheelScore[] | Record<string, number>
  size?: number
  animated?: boolean
  interactive?: boolean
  showEmoji?: boolean
  showLabels?: boolean
  glowIntensity?: 'low' | 'medium' | 'high'
  onCategoryClick?: (category_id: string) => void
}

// Преміум кольори у стилі "Сила Волі"
const PREMIUM_COLORS = {
  // Фон - темний teal
  bgPrimary: '#0d1b2a',
  bgSecondary: '#1b3a4b',
  bgTertiary: '#274c5e',
  
  // Акценти
  orange: '#f97316',
  orangeGlow: 'rgba(249, 115, 22, 0.6)',
  gold: '#f59e0b',
  goldGlow: 'rgba(245, 158, 11, 0.5)',
  
  // Полігон - градієнт teal до orange
  polygonStart: 'rgba(27, 58, 75, 0.8)',
  polygonEnd: 'rgba(249, 115, 22, 0.4)',
  
  // Лінії
  gridLine: 'rgba(255, 255, 255, 0.08)',
  gridLineBright: 'rgba(255, 255, 255, 0.15)',
}

export const WheelChart = ({
  scores,
  size = 280,
  animated = true,
  interactive = false,
  showEmoji = true,
  showLabels = false,
  glowIntensity = 'medium',
  onCategoryClick,
}: WheelChartProps) => {
  // Нормалізуємо scores
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

  // Рахуємо точки полігону
  const points = useMemo(() => {
    return WHEEL_CATEGORIES.map((cat, i) => {
      const angle = (Math.PI * 2 * i) / WHEEL_CATEGORIES.length - Math.PI / 2
      const scoreItem = normalizedScores.find((s) => s.category_id === cat.id)
      const score = scoreItem?.score || 0
      const radius = (score / 10) * maxRadius

      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        emojiX: center + (maxRadius + 28) * Math.cos(angle),
        emojiY: center + (maxRadius + 28) * Math.sin(angle),
        outerX: center + maxRadius * Math.cos(angle),
        outerY: center + maxRadius * Math.sin(angle),
        category: cat,
        score,
        angle,
      }
    })
  }, [normalizedScores, center, maxRadius])

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Glow інтенсивність
  const glowBlur = glowIntensity === 'high' ? 25 : glowIntensity === 'medium' ? 15 : 8
  const glowOpacity = glowIntensity === 'high' ? 0.8 : glowIntensity === 'medium' ? 0.6 : 0.4

  const handleCategoryClick = (category_id: string) => {
    if (interactive && onCategoryClick) {
      onCategoryClick(category_id)
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Зовнішнє світіння */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 blur-xl"
        style={{
          background: `radial-gradient(circle, ${PREMIUM_COLORS.orangeGlow} 0%, transparent 70%)`,
        }}
      />

      <svg 
        width={size} 
        height={size} 
        className="overflow-visible relative z-10"
        style={{ filter: `drop-shadow(0 0 ${glowBlur}px ${PREMIUM_COLORS.orangeGlow})` }}
      >
        <defs>
          {/* Градієнт для полігону */}
          <linearGradient id="wheelPolygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PREMIUM_COLORS.polygonStart} />
            <stop offset="50%" stopColor="rgba(39, 76, 94, 0.6)" />
            <stop offset="100%" stopColor={PREMIUM_COLORS.polygonEnd} />
          </linearGradient>

          {/* Градієнт для обводки полігону */}
          <linearGradient id="wheelStrokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="30%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor={PREMIUM_COLORS.orange} />
            <stop offset="100%" stopColor={PREMIUM_COLORS.gold} />
          </linearGradient>

          {/* Градієнт для фону */}
          <radialGradient id="wheelBgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PREMIUM_COLORS.bgTertiary} stopOpacity="0.3" />
            <stop offset="70%" stopColor={PREMIUM_COLORS.bgSecondary} stopOpacity="0.5" />
            <stop offset="100%" stopColor={PREMIUM_COLORS.bgPrimary} stopOpacity="0.7" />
          </radialGradient>

          {/* Glow фільтр */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Точковий glow */}
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Основне темне коло-фон */}
        <circle
          cx={center}
          cy={center}
          r={maxRadius}
          fill="url(#wheelBgGradient)"
          stroke={PREMIUM_COLORS.gridLine}
          strokeWidth="1"
        />

        {/* Концентричні кола рівнів (2, 4, 6, 8, 10) */}
        {[2, 4, 6, 8, 10].map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 10) * maxRadius}
            fill="none"
            stroke={level === 10 ? PREMIUM_COLORS.gridLineBright : PREMIUM_COLORS.gridLine}
            strokeWidth={level === 10 ? 1.5 : 1}
            strokeDasharray={level < 10 ? '4 4' : 'none'}
          />
        ))}

        {/* Радіальні лінії від центру до країв */}
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
              strokeWidth="1"
            />
          )
        })}

        {/* Анімований полігон результатів */}
        {animated ? (
          <motion.polygon
            points={polygonPoints}
            fill="url(#wheelPolygonGradient)"
            stroke="url(#wheelStrokeGradient)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#glow)"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.8, 
              ease: [0.34, 1.56, 0.64, 1], // spring-like
            }}
            style={{ transformOrigin: 'center' }}
          />
        ) : (
          <polygon
            points={polygonPoints}
            fill="url(#wheelPolygonGradient)"
            stroke="url(#wheelStrokeGradient)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
        )}

        {/* Точки на вершинах полігону (оцінки) */}
        {points.map((point, i) =>
          animated ? (
            <motion.circle
              key={`vertex-${i}`}
              cx={point.x}
              cy={point.y}
              r={6}
              fill={point.category.color}
              stroke="white"
              strokeWidth="2"
              filter="url(#dotGlow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.4, type: 'spring' }}
              className={interactive ? 'cursor-pointer hover:scale-125 transition-transform' : ''}
              onClick={() => handleCategoryClick(point.category.id)}
            />
          ) : (
            <circle
              key={`vertex-${i}`}
              cx={point.x}
              cy={point.y}
              r={6}
              fill={point.category.color}
              stroke="white"
              strokeWidth="2"
              filter="url(#dotGlow)"
              className={interactive ? 'cursor-pointer' : ''}
              onClick={() => handleCategoryClick(point.category.id)}
            />
          )
        )}

        {/* Маленькі точки на зовнішньому колі */}
        {points.map((point, i) => (
          <motion.circle
            key={`outer-${i}`}
            cx={point.outerX}
            cy={point.outerY}
            r={4}
            fill={point.category.color}
            opacity={0.7}
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={animated ? { delay: 0.05 * i, duration: 0.3 } : undefined}
            className={interactive ? 'cursor-pointer hover:opacity-100' : ''}
            onClick={() => handleCategoryClick(point.category.id)}
          />
        ))}

        {/* Числові мітки рівнів */}
        {showLabels && [2, 4, 6, 8, 10].map((level) => (
          <text
            key={`label-${level}`}
            x={center + 8}
            y={center - (level / 10) * maxRadius + 4}
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
            fontFamily="monospace"
          >
            {level}
          </text>
        ))}
      </svg>

      {/* Emoji категорій навколо колеса */}
      {showEmoji &&
        points.map((point, i) =>
          animated ? (
            <motion.div
              key={`emoji-${i}`}
              className={`
                absolute flex items-center justify-center
                w-10 h-10 rounded-xl
                bg-gradient-to-br from-white/10 to-white/5
                backdrop-blur-sm border border-white/10
                shadow-lg
                ${interactive ? 'cursor-pointer hover:scale-110 hover:border-white/30 transition-all' : ''}
              `}
              style={{
                left: point.emojiX - 20,
                top: point.emojiY - 20,
                boxShadow: `0 4px 20px ${point.category.color}30`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 * i + 0.5, duration: 0.4, type: 'spring' }}
              onClick={() => handleCategoryClick(point.category.id)}
              title={`${point.category.nameUk}: ${point.score}/10`}
            >
              <span className="text-xl select-none">{point.category.emoji}</span>
            </motion.div>
          ) : (
            <div
              key={`emoji-${i}`}
              className={`
                absolute flex items-center justify-center
                w-10 h-10 rounded-xl
                bg-gradient-to-br from-white/10 to-white/5
                backdrop-blur-sm border border-white/10
                shadow-lg
                ${interactive ? 'cursor-pointer hover:scale-110 hover:border-white/30 transition-all' : ''}
              `}
              style={{
                left: point.emojiX - 20,
                top: point.emojiY - 20,
                boxShadow: `0 4px 20px ${point.category.color}30`,
              }}
              onClick={() => handleCategoryClick(point.category.id)}
              title={`${point.category.nameUk}: ${point.score}/10`}
            >
              <span className="text-xl select-none">{point.category.emoji}</span>
            </div>
          )
        )}
    </div>
  )
}

export default WheelChart