// backend/src/modules/wheel/wheel.pdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SPHERE_LABELS, type WheelPDFData } from './types.js';

// Простий трансліт для PDF, щоб уникнути WinAnsi проблем
const translitMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'yi', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
};

const toPdfSafeText = (value: string): string => {
  return value
    .split('')
    .map(ch => {
      const lower = ch.toLowerCase();
      if (translitMap[lower] !== undefined) {
        const mapped = translitMap[lower];
        return ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      const code = ch.charCodeAt(0);
      if (code >= 32 && code <= 126) return ch;
      if ('’ʼ‘'.includes(ch)) return "'";
      if ('–—'.includes(ch)) return '-';
      if ('•'.includes(ch)) return '*';
      return ' ';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
};

export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = page.getHeight() - margin;

  const drawText = (value: string, size = 11, bold = false, x = margin, color = rgb(0.12, 0.14, 0.2)) => {
    page.drawText(toPdfSafeText(value), { x, y, size, font: bold ? fontBold : fontRegular, color });
    y -= size + 6;
  };

  const wrapText = (value: string, maxWidth = page.getWidth() - margin * 2, size = 10, bold = false, x = margin) => {
    const words = toPdfSafeText(value).split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const width = (bold ? fontBold : fontRegular).widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        drawText(line, size, bold, x);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) drawText(line, size, bold, x);
  };

  // Заголовки
  drawText('Starway Studio', 11, true, margin, rgb(0.18, 0.2, 0.25));
  drawText(new Date(data.createdAt).toLocaleDateString('en-GB'), 10, false, page.getWidth() - margin - 90, rgb(0.35, 0.38, 0.45));
  y -= 8;

  drawText('Wheel Balance Report', 20, true, margin, rgb(0.12, 0.15, 0.24));
  drawText(`User: ${data.userName}`, 11, false, margin, rgb(0.28, 0.32, 0.4));
  y -= 8;

  // Scores
  drawText('Area Scores', 13, true);
  for (const s of data.scores) {
    if (y < 120) break; // захист від переповнення
    wrapText(`${SPHERE_LABELS[s.categoryId] ?? s.categoryId}: ${s.score}/10 | ${s.comment || '-'}`);
  }

  y -= 10;
  drawText('Short Analysis', 13, true);
  wrapText(`Weakest area: ${SPHERE_LABELS[data.weakestSphere] ?? data.weakestSphere}`);
  wrapText(`Focus area: ${SPHERE_LABELS[data.focusSphere] ?? data.focusSphere}`);
  wrapText(data.analysis);

  y -= 8;
  drawText('Action Plan (Was | Is | Improve)', 12, true);
  wrapText(
    `Was: imbalance in "${SPHERE_LABELS[data.weakestSphere] ?? data.weakestSphere}". ` +
    `Is: focus point selected "${SPHERE_LABELS[data.focusSphere] ?? data.focusSphere}". ` +
    `Improve: add 1-2 daily actions over the next 7 days.`,
  );

  page.drawLine({
    start: { x: margin, y: 56 },
    end: { x: page.getWidth() - margin, y: 56 },
    thickness: 1,
    color: rgb(0.9, 0.92, 0.96),
  });

  drawText('Affirmation: I build balance through consistent daily actions.', 10, false, margin, rgb(0.32, 0.36, 0.43));

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}