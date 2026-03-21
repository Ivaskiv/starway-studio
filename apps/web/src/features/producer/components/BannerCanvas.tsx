import { useEffect, useRef } from 'react'

type BannerFormat = 'square_1080' | 'stories_1080' | 'facebook_banner'

const FORMAT_SIZES: Record<BannerFormat, { w: number; h: number; scale: number }> = {
  square_1080:    { w: 1080, h: 1080, scale: 0.28 },
  stories_1080:   { w: 1080, h: 1920, scale: 0.18 },
  facebook_banner:{ w: 1200, h: 628,  scale: 0.32 },
}

interface Props {
  format:      BannerFormat
  headline:    string
  subheadline: string
  cta:         string
  badge:       string | null
  accentColor: string
  expertName:  string
}

// Hex → rgb компоненти
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [
    parseInt(c.slice(0,2), 16),
    parseInt(c.slice(2,4), 16),
    parseInt(c.slice(4,6), 16),
  ]
}

// Wrap text у canvas
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY)
      line = word
      curY += lineH
    } else {
      line = test
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineH }
  return curY
}

export function BannerCanvas({ format, headline, subheadline, cta, badge, accentColor, expertName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizes     = FORMAT_SIZES[format]
  const { w, h, scale } = sizes

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = w
    canvas.height = h
    canvas.style.setProperty('--cf-canvas-width', `${w * scale}px`)
    canvas.style.setProperty('--cf-canvas-height', `${h * scale}px`)

    const [ar, ag, ab] = hexToRgb(accentColor)

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0,   '#0d0f1a')
    bg.addColorStop(0.5, '#111422')
    bg.addColorStop(1,   '#0e1020')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // ── Accent radial glow ──
    const glow = ctx.createRadialGradient(w * 0.2, h * 0.4, 0, w * 0.2, h * 0.4, w * 0.5)
    glow.addColorStop(0,   `rgba(${ar},${ag},${ab},0.18)`)
    glow.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    // ── Geometric line ──
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w * 0.1,  h * 0.6)
    ctx.lineTo(w * 0.45, h * 0.35)
    ctx.lineTo(w * 0.9,  h * 0.55)
    ctx.stroke()
    // node dots
    const nodeDots: [number, number][] = [
      [w * 0.1, h * 0.6],
      [w * 0.45, h * 0.35],
      [w * 0.9, h * 0.55],
    ]
    nodeDots.forEach(([cx, cy]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fill()
    })

    const pad = w * 0.08

    // ── Badge ──
    if (badge) {
      const bx = pad, by = h * 0.06
      const bw = ctx.measureText(badge).width + 40, bh = 52
      ctx.fillStyle = `rgba(${ar},${ag},${ab},0.85)`
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 12)
      ctx.fill()
      ctx.font = `700 ${w * 0.025}px sans-serif`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.fillText(badge, bx + 20, by + bh * 0.65)
    }

    // ── Headline ──
    ctx.font        = `900 ${w * 0.055}px sans-serif`
    ctx.fillStyle   = '#ffffff'
    ctx.textAlign   = 'left'
    const headY = h * (badge ? 0.22 : 0.15)
    const afterHead = wrapText(ctx, headline, pad, headY, w * 0.84, w * 0.07)

    // ── Subheadline ──
    ctx.font      = `400 ${w * 0.032}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    wrapText(ctx, subheadline, pad, afterHead + h * 0.02, w * 0.84, w * 0.042)

    // ── CTA button ──
    const btnY = h * 0.78, btnH = h * 0.08
    const btnW = Math.min(ctx.measureText(cta).width + w * 0.1, w * 0.7)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(pad, btnY, btnW, btnH, btnH / 2)
    ctx.fill()
    ctx.font      = `700 ${w * 0.03}px sans-serif`
    ctx.fillStyle = '#0d0f1a'
    ctx.textAlign = 'left'
    ctx.fillText(cta, pad + btnW * 0.12, btnY + btnH * 0.64)

    // ── Expert name ──
    ctx.font      = `500 ${w * 0.022}px sans-serif`
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.7)`
    ctx.textAlign = 'left'
    ctx.fillText(expertName, pad, h * 0.94)

  }, [format, headline, subheadline, cta, badge, accentColor, expertName])

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href     = canvas.toDataURL('image/png', 1.0)
    a.download = `banner_${format}_${Date.now()}.png`
    a.click()
  }

  return (
    <div className="cf-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="cf-canvas"
      />
      <button className="cf-download-btn" onClick={downloadPng}>
        ⬇ Завантажити PNG
      </button>
    </div>
  )
}
