// backend/src/modules/wheel/wheel.pdf.ts
import { SPHERE_LABELS, WheelPDFData } from '@/modules/wheel/wheel.types.js'
import puppeteer from 'puppeteer'


export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  const userLabel = 'Користувач'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #f97316; text-align: center; }
        .meta { color: #666; margin-bottom: 20px; }
        .sphere { margin: 15px 0; padding: 10px; border-left: 3px solid #f97316; }
        .sphere-name { font-weight: bold; font-size: 14px; }
        .sphere-score { color: #f97316; font-size: 18px; }
        .comment { color: #666; font-size: 12px; margin-top: 5px; }
        .analysis { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>🎡 Колесо Балансу</h1>
      <div class="meta">
        <p><strong>${userLabel}:</strong> ${data.userName}</p>
        <p><strong>Дата:</strong> ${new Date(data.createdAt).toLocaleDateString('uk-UA')}</p>
      </div>

      <h2>Оцінки сфер:</h2>
      ${data.scores
        .map(
          (s) => `
        <div class="sphere">
          <div class="sphere-name">
            ${SPHERE_LABELS[s.categoryId] || s.categoryId}
          </div>
          <div class="sphere-score">${s.score}/10</div>
          ${s.comment ? `<div class="comment">"${s.comment}"</div>` : ''}
        </div>
      `
  )
      .join('')}

      <div class="analysis">
        <h3>📊 Аналіз AI:</h3>
        <p><strong>Найслабша сфера:</strong> ${SPHERE_LABELS[data.weakestSphere]}</p>
        <p><strong>Сфера фокусу:</strong> ${SPHERE_LABELS[data.focusSphere]}</p>
        <p style="margin-top: 15px;">${data.analysis}</p>
      </div>
    </body>
    </html>
  `

  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })

  await browser.close()
  return Buffer.from(pdfBuffer)
}



