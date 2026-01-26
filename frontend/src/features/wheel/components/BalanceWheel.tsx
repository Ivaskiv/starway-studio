// frontend/src/features/wheel/components/BalanceWheel.tsx
interface BalanceWheelProps {
  score: number // 0-10
  maxScore?: number
}

// Колесо балансу як полігон з емоджі
export function BalanceWheel({ score, maxScore = 10 }: BalanceWheelProps) {
  const emojis = ['💪', '🔥', '🎯', '⚡', '💰', '🏆', '❤️', '🧠']
  const points = emojis.length
  const radius = 100
  const centerX = 120
  const centerY = 120
  
  // Генерація точок полігону
  const generatePoints = (value: number) => {
    const ratio = value / maxScore
    return emojis.map((_, i) => {
      const angle = (i * 2 * Math.PI) / points - Math.PI / 2
      const r = radius * ratio
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      }
    })
  }

  // Позиції для емоджі (на максимальному радіусі)
  const emojiPositions = emojis.map((_, i) => {
    const angle = (i * 2 * Math.PI) / points - Math.PI / 2
    const r = radius + 20
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    }
  })

  const polygonPoints = generatePoints(score)
  const maxPolygonPoints = generatePoints(maxScore)

  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg width="240" height="240" viewBox="0 0 240 240" className="absolute inset-0">
        <defs>
          {/* Gradient для полігону */}
          <linearGradient id="polygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
          </linearGradient>
          
          {/* Glow ефект */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Фонова сітка (максимум) */}
        <polygon
          points={maxPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Лінії від центру до кожної точки */}
        {maxPolygonPoints.map((p, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Основний полігон (значення користувача) */}
        <polygon
          points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="url(#polygonGradient)"
          stroke="#a855f7"
          strokeWidth="3"
          filter="url(#glow)"
          className="transition-all duration-700"
        />

        {/* Точки на вершинах */}
        {polygonPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#ffffff"
            stroke="#a855f7"
            strokeWidth="2"
            className="transition-all duration-700"
          />
        ))}

        {/* Центральна точка */}
        <circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill="#f97316"
          filter="url(#glow)"
        />
      </svg>

      {/* Емоджі навколо */}
      {emojis.map((emoji, i) => (
        <div
          key={i}
          className="absolute text-2xl transition-transform hover:scale-125"
          style={{
            left: emojiPositions[i].x - 16,
            top: emojiPositions[i].y - 16,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {emoji}
        </div>
      ))}

      {/* Центральний скор */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{score}</div>
          <div className="text-xs text-white/60">/ {maxScore}</div>
        </div>
      </div>
    </div>
  )
}