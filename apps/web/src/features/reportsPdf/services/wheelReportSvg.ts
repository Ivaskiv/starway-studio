import type { WheelAssessment } from '@/features/wheel/types/wheel.types'

const SPHERE_META: Record<string, { label: string; emoji: string }> = {
  money: { label: 'Фінанси', emoji: '💰' },
  realization: { label: 'Реалізація', emoji: '🎯' },
  relationships: { label: 'Стосунки', emoji: '❤️' },
  energy: { label: 'Енергія', emoji: '⚡' },
  freedom: { label: 'Свобода', emoji: '🕊️' },
  innerSupport: { label: 'Опора', emoji: '🧘' },
  health: { label: "Здоров'я", emoji: '🏥' },
  growth: { label: 'Розвиток', emoji: '📚' },
}

type WheelSvgOptions = {
  size?: number
  background?: string
}

export function buildWheelReportSvg(
  latestWheel: WheelAssessment | null,
  options: WheelSvgOptions = {},
) {
  const size = options.size ?? 260
  const background = options.background ?? '#FFFFFF'

  if (!latestWheel || latestWheel.scores.length === 0) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="24" fill="${background}" stroke="#D7DFEA"/>
        <text x="${size / 2}" y="${size / 2}" text-anchor="middle" fill="#5B6472" font-size="14">
          Ще немає колеса за цей період
        </text>
      </svg>
    `
  }

  const outerRadius = size * 0.34
  const textRadius = outerRadius + size * 0.085
  const rings = 5
  const numPoints = latestWheel.scores.length
  const angleStep = (2 * Math.PI) / numPoints
  const avgScore = latestWheel.scores.reduce((sum, score) => sum + score.score, 0) / Math.max(numPoints, 1)

  const svgPadding = size * 0.18
  const svgSize = size + svgPadding * 2
  const sc = svgSize / 2

  const axisPoints = latestWheel.scores.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2
    return {
      x: sc + outerRadius * Math.cos(angle),
      y: sc + outerRadius * Math.sin(angle),
    }
  })

  const scorePoints = latestWheel.scores.map((score, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (Math.max(1, score.score) / 10) * outerRadius
    return {
      categoryId: score.categoryId,
      score: score.score,
      x: sc + r * Math.cos(angle),
      y: sc + r * Math.sin(angle),
    }
  })

  const uid = `pdf-${size}-${Math.round(avgScore * 10)}`
  const arcSpanRad = angleStep * 0.68
  const fontSize = Math.max(8.5, size * 0.042)
  const emojiSize = Math.max(11, size * 0.055)
  const ringValues = Array.from({ length: rings }, (_, ring) => Math.round(((ring + 1) * 10) / rings))
  const ringGapPx = Math.max(22, size * 0.11)

  const labelArcs = latestWheel.scores.map((score, i) => {
    const angle = i * angleStep - Math.PI / 2
    const startAngle = angle - arcSpanRad / 2
    const endAngle = angle + arcSpanRad / 2
    const x1 = sc + textRadius * Math.cos(startAngle)
    const y1 = sc + textRadius * Math.sin(startAngle)
    const x2 = sc + textRadius * Math.cos(endAngle)
    const y2 = sc + textRadius * Math.sin(endAngle)
    const label = SPHERE_META[score.categoryId]?.label ?? score.categoryId
    return {
      id: `arc-${uid}-${i}`,
      d: `M ${x1} ${y1} A ${textRadius} ${textRadius} 0 0 1 ${x2} ${y2}`,
      label,
    }
  })

  const ringGuides = ringValues.map((value, index) => {
    const radius = (outerRadius / rings) * (index + 1)
    const circumference = 2 * Math.PI * radius
    const gapAngle = (ringGapPx / circumference) * Math.PI * 2
    const startAngle = -Math.PI / 2 + gapAngle / 2
    const endAngle = (Math.PI * 3) / 2 - gapAngle / 2
    const startX = sc + radius * Math.cos(startAngle)
    const startY = sc + radius * Math.sin(startAngle)
    const endX = sc + radius * Math.cos(endAngle)
    const endY = sc + radius * Math.sin(endAngle)
    return {
      value,
      d: `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`,
      labelY: sc - radius + 4,
    }
  })

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      <defs>
        <radialGradient id="wheel-gradient-${uid}" cx="50%" cy="45%" r="58%">
          <stop offset="0%" stop-color="rgba(47,111,237,0.44)" />
          <stop offset="100%" stop-color="rgba(47,111,237,0.22)" />
        </radialGradient>
        ${labelArcs.map(arc => `<path id="${arc.id}" d="${arc.d}" fill="none" />`).join('')}
      </defs>
      <rect x="0" y="0" width="${svgSize}" height="${svgSize}" rx="28" fill="${background}" />
      <circle cx="${sc}" cy="${sc}" r="${outerRadius + 8}" fill="none" stroke="rgba(47,111,237,0.18)" stroke-width="1" />
      ${ringGuides.map((ring, index) => `
        <g>
          <path d="${ring.d}" fill="none" stroke="${index === ringGuides.length - 1 ? 'rgba(47,111,237,0.48)' : 'rgba(47,111,237,0.18)'}" stroke-width="${index === ringGuides.length - 1 ? 1.2 : 1}" stroke-linecap="round" />
          <text x="${sc}" y="${ring.labelY}" text-anchor="middle" dominant-baseline="central" font-size="${Math.max(9, size * 0.034)}" fill="rgba(16,24,40,0.64)">
            ${ring.value}
          </text>
        </g>
      `).join('')}
      ${axisPoints.map((ap, i) => `<line key="axis-${i}" x1="${sc}" y1="${sc}" x2="${ap.x}" y2="${ap.y}" stroke="rgba(47,111,237,0.22)" stroke-width="1" />`).join('')}
      ${axisPoints.map(ap => `<circle cx="${ap.x}" cy="${ap.y}" r="2.8" fill="rgba(47,111,237,0.96)" />`).join('')}
      <polygon
        points="${scorePoints.map(point => `${point.x},${point.y}`).join(' ')}"
        fill="url(#wheel-gradient-${uid})"
        stroke="rgba(47,111,237,0.96)"
        stroke-width="2.8"
      />
      ${scorePoints.map(point => `
        <g>
          <circle cx="${point.x}" cy="${point.y}" r="15" fill="rgba(15,23,42,0.08)" stroke="rgba(47,111,237,${(0.28 + point.score * 0.05).toFixed(2)})" stroke-width="1.5" />
          <circle cx="${point.x}" cy="${point.y}" r="8" fill="rgba(47,111,237,${(0.34 + (Math.max(1, Math.min(10, point.score)) - 1) * 0.06).toFixed(2)})" stroke="rgba(255,255,255,0.95)" stroke-width="1.8" />
          <text x="${point.x}" y="${point.y + 0.5}" text-anchor="middle" dominant-baseline="middle" font-size="${emojiSize}">
            ${SPHERE_META[point.categoryId]?.emoji ?? '✨'}
          </text>
        </g>
      `).join('')}
      <circle cx="${sc}" cy="${sc}" r="17" fill="rgba(47,111,237,0.24)" stroke="rgba(47,111,237,0.64)" />
      <circle cx="${sc}" cy="${sc}" r="5.5" fill="rgba(255,255,255,0.95)" />
      ${labelArcs.map(arc => `
        <text font-size="${fontSize}" font-weight="500" fill="rgba(16,24,40,0.78)" letter-spacing="0.04em">
          <textPath href="#${arc.id}" startOffset="50%" text-anchor="middle">${arc.label}</textPath>
        </text>
      `).join('')}
      ${latestWheel.scores.map((_, i) => {
        const angle = (i + 0.5) * angleStep - Math.PI / 2
        return `<circle cx="${sc + textRadius * Math.cos(angle)}" cy="${sc + textRadius * Math.sin(angle)}" r="1.8" fill="rgba(47,111,237,0.42)" />`
      }).join('')}
    </svg>
  `
}
