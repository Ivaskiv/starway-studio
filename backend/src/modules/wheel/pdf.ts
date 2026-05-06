import PDFDocument from 'pdfkit'
import path from 'path'
import { fileURLToPath } from 'url'
import type { WheelPDFData, WheelScore } from './types.js'
import { SPHERE_LABELS, WHEEL_SPHERES, isWheelSphereId } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─────────────────────────────────────────────────────────
// Шрифти — TTF файли мають лежати в assets/fonts/
// Завантажити: https://fonts.google.com/specimen/Inter
// Скопіювати Inter-Regular.ttf і Inter-Bold.ttf в
// backend/src/assets/fonts/
// ─────────────────────────────────────────────────────────
const FONTS_DIR = path.resolve(__dirname, '../../assets/fonts')

const FONT = {
  regular: path.join(FONTS_DIR, 'Inter-Regular.ttf'),
  bold:    path.join(FONTS_DIR, 'Inter-Bold.ttf'),
  medium:  path.join(FONTS_DIR, 'Inter-Medium.ttf'),
}

// Fallback — якщо шрифт не знайдено, pdfkit кине error
// тому реєструємо один раз і використовуємо назви
const FONT_REG  = 'Inter-Regular'
const FONT_BOLD = 'Inter-Bold'
const FONT_MED  = 'Inter-Medium'

type PDFDoc = InstanceType<typeof PDFDocument>

// ─────────────────────────────────────────────────────────
// Кольори
// ─────────────────────────────────────────────────────────
const C = {
  bg:           '#0f1117',
  surface:      '#1a1d27',
  border:       '#2a2e3a',
  accent:       '#f97316',
  accentSoft:   '#fbbf24',
  white:        '#ffffff',
  muted:        '#9da5b9',
  dim:          '#4a5568',
  textSec:      '#cbd5e1',
  tagRed:       '#7f1d1d',
  tagRedText:   '#fca5a5',
  tagGreen:     '#14532d',
  tagGreenText: '#86efac',
}

const pageW = 595 - 96
const pageH = 842 - 96

// ─────────────────────────────────────────────────────────
// Утиліти
// ─────────────────────────────────────────────────────────

function filledRect(doc: PDFDoc, x: number, y: number, w: number, h: number, color: string, r = 4) {
  doc.roundedRect(x, y, w, h, r).fill(color)
}

function line(doc: PDFDoc, x1: number, y1: number, x2: number, y2: number, color: string, w = 0.5) {
  doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(w).strokeColor(color).stroke()
}

function reg(doc: PDFDoc)  { doc.font(FONT_REG) }
function bold(doc: PDFDoc) { doc.font(FONT_BOLD) }
function med(doc: PDFDoc)  { doc.font(FONT_MED) }

function sectionTitle(doc: PDFDoc, text: string, y: number) {
  bold(doc)
  doc.fontSize(8).fillColor(C.accent).text(text.toUpperCase(), 48, y, { characterSpacing: 1.2 })
  line(doc, 48, y + 12, 48 + pageW, y + 12, C.border)
  return y + 18
}

function bodyText(doc: PDFDoc, text: string, x: number, y: number, w: number, size = 10, color = C.textSec) {
  reg(doc)
  doc.fontSize(size).fillColor(color).text(text, x, y, { width: w, lineGap: 1.5 })
}

function measureHeight(doc: PDFDoc, text: string, width: number, size: number) {
  reg(doc)
  doc.fontSize(size)
  return doc.heightOfString(text, { width })
}

function measureWidth(doc: PDFDoc, text: string, size: number) {
  reg(doc)
  doc.fontSize(size)
  return doc.widthOfString(text)
}

function fillPageBackground(doc: PDFDoc) {
  doc.save()
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.bg)
  doc.restore()
}

function labelForSphere(value: string) {
  return isWheelSphereId(value) ? SPHERE_LABELS[value] : value
}

// ─────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────

function drawHeader(doc: PDFDoc, data: WheelPDFData) {
  filledRect(doc, 0, 0, 595, 72, C.surface, 0)
  filledRect(doc, 0, 70, 595, 2, C.accent, 0)

  bold(doc)
  doc.fontSize(18).fillColor(C.accent).text('STARWAY', 48, 20)
  reg(doc)
  doc.fontSize(9).fillColor(C.muted).text('Wheel of Life — Персональний звіт', 48, 42)

  bold(doc)
  doc.fontSize(11).fillColor(C.white).text(data.userName, 350, 18, { width: 200, align: 'right' })

  const dateStr = new Date(data.createdAt).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  reg(doc)
  doc.fontSize(9).fillColor(C.muted).text(dateStr, 350, 34, { width: 200, align: 'right' })
}

// ─────────────────────────────────────────────────────────
// STAT CARDS
// ─────────────────────────────────────────────────────────

function drawStatCards(doc: PDFDoc, scores: WheelScore[], weakest: string, focus: string, y: number) {
  const total = scores.reduce((a, s) => a + s.score, 0)
  const avg   = (total / scores.length).toFixed(1)
  const cards = [
    { val: avg,                    lbl: 'Середній бал' },
    { val: `${total}/80`,          lbl: 'Загальний бал' },
    { val: labelForSphere(weakest), lbl: 'Фокус місяця' },
    { val: labelForSphere(focus),   lbl: 'Сильна сфера' },
  ]
  const cw = (pageW - 12) / 4
  cards.forEach((c, i) => {
    const cx = 48 + i * (cw + 4)
    filledRect(doc, cx, y, cw, 48, C.surface, 6)
    bold(doc)
    doc.fontSize(14).fillColor(C.accent).text(c.val, cx + 6, y + 8, { width: cw - 12, align: 'center' })
    reg(doc)
    doc.fontSize(8).fillColor(C.muted).text(c.lbl, cx + 4, y + 28, { width: cw - 8, align: 'center' })
  })
  return y + 60
}

// ─────────────────────────────────────────────────────────
// SCORE BARS
// ─────────────────────────────────────────────────────────

function drawScoreBars(doc: PDFDoc, scores: WheelScore[], x: number, y: number, colW: number): number {
  let cy = y
  scores.forEach(s => {
    const label = labelForSphere(s.categoryId)
    const pct   = s.score / 10
    const barW  = colW - 60

    reg(doc)
    doc.fontSize(9).fillColor(C.textSec).text(label, x, cy, { width: 72 })

    filledRect(doc, x + 76, cy + 1, barW, 8, C.border, 3)

    if (pct > 0) {
      const fillColor = s.score >= 7 ? C.accent : s.score >= 5 ? C.accentSoft : '#ef4444'
      filledRect(doc, x + 76, cy + 1, Math.max(4, barW * pct), 8, fillColor, 3)
    }

    bold(doc)
    doc.fontSize(9).fillColor(C.accent).text(`${s.score}`, x + 80 + barW, cy, { width: 20, align: 'right' })

    cy += 18
  })
  return cy
}

// ─────────────────────────────────────────────────────────
// RADAR
// ─────────────────────────────────────────────────────────

function drawRadar(doc: PDFDoc, scores: WheelScore[], cx: number, cy: number, r: number) {
  const n = scores.length
  const angleStep = (Math.PI * 2) / n
  const angle = (i: number) => i * angleStep - Math.PI / 2

  for (let layer = 1; layer <= 4; layer++) {
    doc.circle(cx, cy, (r / 4) * layer).lineWidth(0.5).strokeColor(C.border).stroke()
  }
  for (let i = 0; i < n; i++) {
    const ax = cx + Math.cos(angle(i)) * r
    const ay = cy + Math.sin(angle(i)) * r
    doc.moveTo(cx, cy).lineTo(ax, ay).lineWidth(0.5).strokeColor(C.border).stroke()
  }

  const pts = scores.map((s, i) => {
    const rr = (s.score / 10) * r
    return { x: cx + Math.cos(angle(i)) * rr, y: cy + Math.sin(angle(i)) * rr }
  })

  doc.save()
  doc.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => doc.lineTo(p.x, p.y))
  doc.closePath().fillColor(C.accent).fillOpacity(0.22).fill()
  doc.restore()

  doc.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => doc.lineTo(p.x, p.y))
  doc.closePath().lineWidth(1.8).strokeColor(C.accent).fillOpacity(0).stroke()

  pts.forEach(p => {
    doc.circle(p.x, p.y, 3).fillColor(C.accent).fillOpacity(1).fill()
  })

  scores.forEach((s, i) => {
    const a     = angle(i)
    const lx    = cx + Math.cos(a) * (r + 18)
    const ly    = cy + Math.sin(a) * (r + 18)
    const label = labelForSphere(s.categoryId)
    const align = Math.cos(a) > 0.2 ? 'left' : Math.cos(a) < -0.2 ? 'right' : 'center'
    reg(doc)
    doc.fontSize(7).fillColor(C.muted).text(label, lx - 24, ly - 5, { width: 48, align })
  })
}

// ─────────────────────────────────────────────────────────
// INSIGHT BLOCK
// ─────────────────────────────────────────────────────────

function insightBlock(doc: PDFDoc, label: string, text: string, x: number, y: number, w: number): number {
  const textH  = measureHeight(doc, text, w - 20, 10)
  const blockH = textH + 26

  filledRect(doc, x, y, w, blockH, C.surface, 5)
  bold(doc)
  doc.fontSize(7.5).fillColor(C.dim).text(label.toUpperCase(), x + 10, y + 7, { characterSpacing: 0.8 })
  bodyText(doc, text, x + 10, y + 18, w - 20, 10, C.textSec)

  return y + blockH + 6
}

// ─────────────────────────────────────────────────────────
// TAG PILL
// ─────────────────────────────────────────────────────────

function tagPill(doc: PDFDoc, text: string, x: number, y: number, type: 'red' | 'green') {
  const bg  = type === 'red' ? C.tagRed : C.tagGreen
  const col = type === 'red' ? C.tagRedText : C.tagGreenText
  const tw  = measureWidth(doc, text, 8) + 14
  filledRect(doc, x, y, tw, 14, bg, 3)
  reg(doc)
  doc.fontSize(8).fillColor(col).text(text, x + 7, y + 3)
  return tw + 6
}

// ─────────────────────────────────────────────────────────
// ACTION PLAN
// ─────────────────────────────────────────────────────────

function drawActionPlan(doc: PDFDoc, plan: WheelPDFData['insights']['actionPlan'], x: number, y: number, w: number): number {
  let cy = y
  plan.forEach(item => {
    filledRect(doc, x, cy, 20, 14, C.accent, 3)
    bold(doc)
    doc.fontSize(7.5).fillColor(C.white).text(String(item.day), x + 2, cy + 3, { width: 16, align: 'center' })
    bodyText(doc, item.action, x + 26, cy + 1, w - 30, 9.5, C.textSec)
    cy += Math.max(16, measureHeight(doc, item.action, w - 30, 9.5) + 4)
  })
  return cy
}

// ─────────────────────────────────────────────────────────
// MISSIONS
// ─────────────────────────────────────────────────────────

function drawMissions(doc: PDFDoc, missions: WheelPDFData['insights']['adaptiveMissions'], x: number, y: number, w: number): number {
  let cy = y
  missions.forEach(m => {
    const textH = measureHeight(doc, m.mission, w - 20, 10)
    const subH  = measureHeight(doc, m.rationale, w - 20, 8.5)
    const h     = textH + subH + 20

    filledRect(doc, x, cy, w, h, C.surface, 5)
    bold(doc)
    doc.fontSize(10).fillColor(C.white).text(m.mission, x + 10, cy + 7, { width: w - 20 })
    reg(doc)
    doc.fontSize(8.5).fillColor(C.muted).text(m.rationale, x + 10, cy + 7 + textH + 2, { width: w - 20 })

    cy += h + 6
  })
  return cy
}

// ─────────────────────────────────────────────────────────
// GAMIFICATION
// ─────────────────────────────────────────────────────────

function drawGamification(doc: PDFDoc, snap: WheelPDFData['gamification'], x: number, y: number, w: number): number {
  if (!snap) return y
  const items = [
    { lbl: 'BitMind', val: snap.bitMind.toString() },
    { lbl: 'MindXP',  val: snap.mindXP.toString() },
    { lbl: 'Gems',    val: snap.neuroGems.toString() },
    { lbl: 'Рівень',  val: `${snap.level} · ${snap.levelTitle}` },
    { lbl: 'Streak',  val: snap.currentStreakDays != null ? `${snap.currentStreakDays} дн` : '—' },
  ]
  const cw = (w - (items.length - 1) * 6) / items.length
  items.forEach((item, i) => {
    const cx = x + i * (cw + 6)
    filledRect(doc, cx, y, cw, 38, C.surface, 4)
    bold(doc)
    doc.fontSize(11).fillColor(C.accent).text(item.val, cx + 4, y + 6, { width: cw - 8, align: 'center' })
    reg(doc)
    doc.fontSize(7.5).fillColor(C.muted).text(item.lbl, cx + 4, y + 22, { width: cw - 8, align: 'center' })
  })
  return y + 50
}

// ─────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────

function drawFooter(doc: PDFDoc, pageNum: number) {
  const y = 842 - 28
  line(doc, 48, y, 547, y, C.border)
  reg(doc)
  doc.fontSize(8).fillColor(C.dim)
    .text('Starway Studio · ABsystem Report · starway.ai · Конфіденційно', 48, y + 6, { width: 300 })
  doc.fontSize(8).fillColor(C.dim)
    .text(`Сторінка ${pageNum}`, 48, y + 6, { width: pageW, align: 'right' })
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────

export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    autoFirstPage: false,
    // Реєструємо шрифти один раз при ініціалізації документа
    bufferPages: true,
  })

  // ── Реєструємо TTF шрифти ──────────────────────────────
  doc.registerFont(FONT_REG,  FONT.regular)
  doc.registerFont(FONT_BOLD, FONT.bold)
  // Inter-Medium — якщо нема файлу, fallback на Regular
  try {
    doc.registerFont(FONT_MED, FONT.medium)
  } catch {
    doc.registerFont(FONT_MED, FONT.regular)
  }

  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdfPromise = new Promise<Buffer>(resolve =>
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  )

  // ── Нормалізуємо scores ────────────────────────────────
  const orderedScores: WheelScore[] = WHEEL_SPHERES
    .map(id => data.scores.find(s => s.categoryId === id) ?? { categoryId: id, score: 0 })
    .filter(s => s.score > 0 || data.scores.length === 0)
    .concat(data.scores.filter(s => !WHEEL_SPHERES.some(id => id === s.categoryId)))

  const scores    = orderedScores.length ? orderedScores : data.scores
  const sorted    = [...scores].sort((a, b) => a.score - b.score)
  const weakestId = data.weakestSphere ?? sorted[0]?.categoryId ?? ''
  const focusId   = data.focusSphere   ?? sorted[sorted.length - 1]?.categoryId ?? ''

  // ═══════════════════════════════════
  // СТОРІНКА 1 — Огляд + Оцінки
  // ═══════════════════════════════════
  doc.addPage()
  fillPageBackground(doc)
  drawHeader(doc, data)

  let y = 90
  y = drawStatCards(doc, scores, weakestId, focusId, y)
  y += 6

  y = sectionTitle(doc, 'Оцінки по сферах · Радарна діаграма', y)

  const leftW   = 260
  const radarCX = 48 + leftW + 80
  const radarCY = y + 80
  const radarR  = 68

  drawScoreBars(doc, scores, 48, y, leftW)
  drawRadar(doc, scores, radarCX, radarCY, radarR)

  y += Math.max(scores.length * 18 + 10, 180)

  drawFooter(doc, 1)

  // ═══════════════════════════════════
  // СТОРІНКА 2 — AI Аналіз
  // ═══════════════════════════════════
  doc.addPage()
  fillPageBackground(doc)
  drawHeader(doc, data)
  y = 90

  y = sectionTitle(doc, 'AI-аналіз балансу', y)
  if (data.insights.analysis)  y = insightBlock(doc, 'Загальна картина',   data.insights.analysis,  48, y, pageW)
  if (data.insights.diagnosis) y = insightBlock(doc, 'Діагноз дисбалансу', data.insights.diagnosis, 48, y, pageW)
  y += 4

  y = sectionTitle(doc, 'Профіль особистості', y)
  const pp = data.insights.personalityProfile
  if (pp) {
    const hw = (pageW - 8) / 2
    const y1 = y
    insightBlock(doc, 'Стиль рішень',    pp.decisionStyle,  48,          y1, hw)
    insightBlock(doc, 'Мотивація',        pp.motivationType, 48 + hw + 8, y1, hw)
    const h1 = Math.max(
      measureHeight(doc, pp.decisionStyle, hw - 20, 10),
      measureHeight(doc, pp.motivationType, hw - 20, 10),
    ) + 32
    y = y1 + h1

    const y2 = y
    insightBlock(doc, 'Реакція на стрес', pp.stressPattern,  48,          y2, hw)
    insightBlock(doc, 'Рушій розвитку',   pp.growthDriver,   48 + hw + 8, y2, hw)
    const h2 = Math.max(
      measureHeight(doc, pp.stressPattern, hw - 20, 10),
      measureHeight(doc, pp.growthDriver, hw - 20, 10),
    ) + 32
    y = y2 + h2
  }
  y += 4

  if (data.insights.trajectoryPrediction) {
    y = sectionTitle(doc, 'Прогноз траєкторії', y)
    const tp = data.insights.trajectoryPrediction
    if (tp.predictionSummary) y = insightBlock(doc, 'Прогноз', tp.predictionSummary, 48, y, pageW)

    let tx = 48
    bold(doc)
    doc.fontSize(8).fillColor(C.muted).text('ЗОНИ РИЗИКУ', 48, y, { characterSpacing: 0.8 })
    y += 14
    tp.riskAreas.forEach(t => { tx += tagPill(doc, t, tx, y, 'red') })
    y += 22

    tx = 48
    bold(doc)
    doc.fontSize(8).fillColor(C.muted).text('ПОТЕНЦІАЛ РОСТУ', 48, y, { characterSpacing: 0.8 })
    y += 14
    tp.growthPotential.forEach(t => { tx += tagPill(doc, t, tx, y, 'green') })
    y += 26
  }

  drawFooter(doc, 2)

  // ═══════════════════════════════════
  // СТОРІНКА 3 — План дій + Місії
  // ═══════════════════════════════════
  doc.addPage()
  fillPageBackground(doc)
  drawHeader(doc, data)
  y = 90

  y = sectionTitle(doc, `7-денний план дій · ${labelForSphere(weakestId)}`, y)
  if (data.insights.actionPlan?.length) {
    y = drawActionPlan(doc, data.insights.actionPlan, 48, y, pageW)
  }
  y += 8

  y = sectionTitle(doc, 'Адаптивні місії', y)
  if (data.insights.adaptiveMissions?.length) {
    y = drawMissions(doc, data.insights.adaptiveMissions, 48, y, pageW)
  }

  drawFooter(doc, 3)

  // ═══════════════════════════════════
  // СТОРІНКА 4 — Гейміфікація
  // ═══════════════════════════════════
  if (data.gamification) {
    doc.addPage()
    fillPageBackground(doc)
    drawHeader(doc, data)
    y = 90

    y = sectionTitle(doc, 'Прогрес та нагороди', y)
    y = drawGamification(doc, data.gamification, 48, y, pageW)

    drawFooter(doc, 4)
  }

  doc.end()
  return pdfPromise
}
