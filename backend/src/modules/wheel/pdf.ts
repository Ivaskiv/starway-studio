// backend/src/modules/wheel/wheel.pdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SPHERE_LABELS, type WheelPDFData } from './types.js';

const translitMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'yi', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
};

const toPdfSafeText = (value: string): string => {
  let out = '';
  for (const ch of value) {
    const lower = ch.toLowerCase();
    if (translitMap[lower] !== undefined) {
      const mapped = translitMap[lower];
      out += ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      continue;
    }

    // Keep printable ASCII only to avoid WinAnsi encoding errors.
    const code = ch.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      out += ch;
    } else if (ch === '’' || ch === 'ʼ' || ch === '‘') {
      out += "'";
    } else if (ch === '–' || ch === '—') {
      out += '-';
    } else if (ch === '•') {
      out += '*';
    } else {
      out += ' ';
    }
  }

  return out.replace(/\s+/g, ' ').trim();
};

export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  // fix code_x: keep PDF portable with StandardFonts by transliterating non-ASCII text before drawText.
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = page.getHeight() - margin;

  const text = (value: string, size = 11, bold = false, x = margin, color = rgb(0.12, 0.14, 0.2)) => {
    page.drawText(toPdfSafeText(value), {
      x,
      y,
      size,
      font: bold ? fontBold : fontRegular,
      color,
    });
    y -= size + 6;
  };

  const wrapText = (
    value: string,
    maxWidth = page.getWidth() - margin * 2,
    size = 10,
    bold = false,
    x = margin,
  ) => {
    const safe = toPdfSafeText(value);
    const words = safe.split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const width = (bold ? fontBold : fontRegular).widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        text(line, size, bold, x);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) text(line, size, bold, x);
  };

  text('Starway Studio', 11, true, margin, rgb(0.18, 0.2, 0.25));
  page.drawText(new Date(data.createdAt).toLocaleDateString('en-GB'), {
    x: page.getWidth() - margin - 90,
    y: page.getHeight() - margin,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.38, 0.45),
  });
  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.94),
  });
  y -= 24;

  text('Wheel Balance Report', 20, true, margin, rgb(0.12, 0.15, 0.24));
  text(`User: ${data.userName}`, 11, false, margin, rgb(0.28, 0.32, 0.4));
  y -= 8;

  const rows = data.scores.map(score => ({
    area: SPHERE_LABELS[score.categoryId] || score.categoryId,
    value: `${score.score}/10`,
    note: score.comment || '-',
  }));

  text('Area Scores', 13, true);
  y -= 4;
  for (const row of rows) {
    if (y < 210) break;
    wrapText(`${row.area}: ${row.value} | ${row.note}`, page.getWidth() - margin * 2, 10);
  }

  y -= 10;
  text('Short Analysis', 13, true);
  wrapText(`Weakest area: ${SPHERE_LABELS[data.weakestSphere] || data.weakestSphere}`, page.getWidth() - margin * 2, 10);
  wrapText(`Focus area: ${SPHERE_LABELS[data.focusSphere] || data.focusSphere}`, page.getWidth() - margin * 2, 10);
  wrapText(data.analysis, page.getWidth() - margin * 2, 10);

  y -= 8;
  text('Was | Is | Improve', 12, true);
  wrapText(
    `Was: imbalance in "${SPHERE_LABELS[data.weakestSphere] || data.weakestSphere}". ` +
      `Is: focus point selected "${SPHERE_LABELS[data.focusSphere] || data.focusSphere}". ` +
      `Improve: add 1-2 daily actions for the focus area over the next 7 days.`,
    page.getWidth() - margin * 2,
    10,
  );

  page.drawLine({
    start: { x: margin, y: 56 },
    end: { x: page.getWidth() - margin, y: 56 },
    thickness: 1,
    color: rgb(0.9, 0.92, 0.96),
  });
  page.drawText('Affirmation: I build balance through consistent daily actions.', {
    x: margin,
    y: 38,
    size: 10,
    font: fontRegular,
    color: rgb(0.32, 0.36, 0.43),
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
