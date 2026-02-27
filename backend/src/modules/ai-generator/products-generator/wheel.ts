// backend/src/modules/ai-generator/products-generator/wheel.ts
import { prisma } from '@/db/client.js';
import { openai } from '@/lib/openai.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Context, Telegraf } from 'telegraf';
// import { encryptSecret } from '@/lib/secrets.js';
// import { isSuperAdminEmail } from '@/modules/auth/superadmin.js';

// ── Типи ──────────────────────────────────────────────────────────────────────
export interface WheelScore {
  categoryId: string;
  score: number;
  comment?: string | null;
}

export interface WheelUserContext {
  name: string;
  email: string | null;
  phone: string | null;
  gender?: 'male' | 'female' | null;
  age: number | null;
}

export interface WheelPDFData {
  userName: string;
  scores: WheelScore[];
  weakestSphere: string;
  focusSphere: string;
  analysis: string;
  createdAt: string;
}

export interface WheelAnalytics {
  totalAssessments: number;
  averageScores: Record<string, number>;
  mostCommonWeakest: string;
  mostCommonFocus: string;
  trend: 'improving' | 'declining' | 'stable';
}

// ── Константи ─────────────────────────────────────────────────────────────────
export const SPHERE_LABELS: Record<string, string> = {
  money: 'Гроші',
  realization: 'Реалізація',
  relationships: 'Відносини',
  energy_body: 'Енергія/Тіло',
  freedom_time: 'Свобода/Час',
  inner_support: 'Внутрішня опора',
  environment: 'Оточення',
  meaning_direction: 'Сенс/Напрямок',
};

export const FIXED_SPHERES = [
  'money', 'realization', 'relationships', 'energy_body',
  'freedom_time', 'inner_support', 'environment', 'meaning_direction',
] as const;
export type FixedSphere = typeof FIXED_SPHERES[number];

// ── HELPERS ──────────────────────────────────────────────────────────────────
export const findWeakest  = (scores: WheelScore[]) => scores.reduce((min, s) => s.score < min.score ? s : min);
export const findStrongest = (scores: WheelScore[]) => scores.reduce((max, s) => s.score > max.score ? s : max);
export const calculateImbalance = (scores: WheelScore[]) =>
  findStrongest(scores).score - findWeakest(scores).score;

export function findFocus(scores: WheelScore[], weakest: WheelScore): WheelScore {
  const alternatives = scores.filter(s => s.categoryId !== weakest.categoryId && s.score < 7);
  return alternatives.length > 0 ? alternatives[0] : weakest;
}

export function scoresToMap(scores: WheelScore[]): Record<string, number> {
  return Object.fromEntries(scores.map(s => [s.categoryId, s.score]));
}

export function scoresFromMap(map: unknown): WheelScore[] {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
  return Object.entries(map as Record<string, number>).map(([categoryId, score]) => ({ categoryId, score }));
}

// ── AI-АНАЛІЗ ────────────────────────────────────────────────────────────────
export async function generateWheelAnalysis(scores: WheelScore[], user: WheelUserContext): Promise<string> {
  const weakest   = findWeakest(scores);
  const strongest = findStrongest(scores);
  const imbalance = strongest.score - weakest.score;

  const scoresText = scores.map(s => `${SPHERE_LABELS[s.categoryId] ?? s.categoryId}: ${s.score}/10${s.comment ? ` ("${s.comment}")` : ''}`).join('\n');

  const prompt = `
Ти — AI-коуч жіночого менторського проєкту "Зоряний шлях".

Користувач: ${user.name || 'Анонім'}

Оцінки сфер (1–10):
${scoresText}

Найслабша: ${SPHERE_LABELS[weakest.categoryId] ?? weakest.categoryId} (${weakest.score}/10)
Найсильніша: ${SPHERE_LABELS[strongest.categoryId] ?? strongest.categoryId} (${strongest.score}/10)
Дисбаланс: ${imbalance} балів

Завдання (2–3 речення, українською, тон — підтримка + дія):
1. Перекіс між сферами
2. Системний вплив слабкої сфери
3. 1–2 конкретні кроки для щоденного циклу
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() || 'Аналіз недоступний';
}

// ── CRUD / СЕРВІС ───────────────────────────────────────────────────────────
export async function createWheel(
  userId: string,
  balanceConfigId: string,
  scores: WheelScore[],
): Promise<any> {
  if (scores.length !== FIXED_SPHERES.length) throw new Error('Необхідно 8 сфер');
  const ids = new Set(scores.map(s => s.categoryId));
  const isValidSet = FIXED_SPHERES.every(id => ids.has(id)) && ids.size === FIXED_SPHERES.length;
  if (!isValidSet) throw new Error('Сфери не відповідають фіксованому набору');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, email: true, expertId: true } });
  if (!user) throw new Error('User not found');
  if (!user.expertId) throw new Error('User has no expertId');

  const weakest = findWeakest(scores);
  const focus = findFocus(scores, weakest);
  const userContext: WheelUserContext = { name: user.firstName ?? user.email ?? 'Користувач', email: user.email, phone: null, age: null };

  const analysis = await generateWheelAnalysis(scores, userContext);
  const note = `Слабка: ${weakest.categoryId} (${weakest.score}/10). Фокус: ${focus.categoryId}. ${analysis}`;

  return prisma.userBalanceEntry.create({
    data: {
      userId,
      expertId: user.expertId,
      balanceConfigId,
      scores: scoresToMap(scores),
      note,
    },
  });
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  let y = page.getHeight() - margin;

  const text = (value: string, size = 11, bold = false, x = margin, color = rgb(0.12, 0.14, 0.2)) => {
    page.drawText(value, { x, y, size, font: bold ? fontBold : fontRegular, color });
    y -= size + 6;
  };

  text('Starway Studio', 11, true, margin, rgb(0.18, 0.2, 0.25));
  text(`User: ${data.userName}`);
  text(`Created: ${new Date(data.createdAt).toLocaleDateString('en-GB')}`);
  y -= 12;
  text('Weakest: ' + (SPHERE_LABELS[data.weakestSphere] || data.weakestSphere));
  text('Focus: ' + (SPHERE_LABELS[data.focusSphere] || data.focusSphere));
  text('Analysis: ' + data.analysis);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ── TELEGRAM ────────────────────────────────────────────────────────────────
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN ?? '');

export async function sendWheelNotification(userId: string, entryId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramUserId: true, telegramUserName: true } });
  if (!user?.telegramUserId) return { ok: false, reason: 'Telegram not linked' };

  await bot.telegram.sendMessage(user.telegramUserId, '🎡 Колесо балансу збережено!', {
    reply_markup: { inline_keyboard: [[{ text: '📄 PDF', callback_data: `wheel_pdf_${entryId}` }]] },
  });
  return { ok: true };
}

bot.on('callback_query', async (ctx: Context) => {
  const cq = ctx.callbackQuery as { data?: string };
  if (!cq?.data?.startsWith('wheel_pdf_')) return;

  const entryId = cq.data.replace('wheel_pdf_', '');

  const entry = await prisma.userBalanceEntry.findUnique({
    where: { id: entryId },
    include: { user: true },
  });

  if (!entry) {
    await ctx.answerCbQuery('❌ Не знайдено');
    return;
  }

  const scores = scoresFromMap(entry.scores);
  const weakest = findWeakest(scores);
  const focus = findFocus(scores, weakest);

  const pdfData: WheelPDFData = {
    userName: entry.user?.firstName ?? entry.user?.email ?? 'Користувач',
    scores,
    weakestSphere: weakest.categoryId,
    focusSphere: focus.categoryId,
    analysis: entry.note ?? '',
    createdAt: entry.createdAt.toISOString(),
  };

  const buffer = await createWheelPDF(pdfData);
  await ctx.telegram.sendDocument(ctx.from!.id, { source: buffer, filename: `wheel-${entryId}.pdf` });
  await ctx.answerCbQuery('✅ PDF надіслано!');
});