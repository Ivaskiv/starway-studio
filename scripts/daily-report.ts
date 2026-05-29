#!/usr/bin/env tsx
/**
 * scripts/daily-report.ts
 * Щоденний звіт замовнику о 22:00 Київ через Telegram.
 * Запуск вручну: pnpm tsx scripts/daily-report.ts
 * Автозапуск: додати в scheduler cron '0 22 * * *' Europe/Kyiv
 *
 * Формат звіту: лаконічний, без води.
 * — Що готово (можна використовувати)
 * — Що в тестуванні (як тестувати)
 * — Прогрес %
 * — Питання по ТЗ (якщо є)
 */

import * as readline from 'readline';

// ─── config ──────────────────────────────────────────────────────────────────

const COACH_CHAT_ID = process.env.COACH_TELEGRAM_ID || '';
const COACH_BOT_TOKEN = process.env.COACH_BOT_TOKEN || '';

// ─── helpers ─────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> =>
  new Promise(resolve => rl.question(q, a => resolve(a.trim())));
const askYN = async (q: string) =>
  (await ask(`${q} [y/n]: `)).toLowerCase() === 'y';

function today(): string {
  return new Date().toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'Europe/Kyiv'
  });
}

// ─── send telegram ────────────────────────────────────────────────────────────

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  if (!COACH_BOT_TOKEN || !chatId) {
    console.log('\n[preview] Повідомлення яке буде надіслано:\n');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));
    console.log('\nWARN: COACH_BOT_TOKEN або COACH_TELEGRAM_ID не вказані в .env');
    return false;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${COACH_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    }
  );

  const data = await res.json() as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error('Telegram error:', data.description);
    return false;
  }
  return true;
}

// ─── build report ─────────────────────────────────────────────────────────────

function buildReport(params: {
  date: string;
  done: string[];
  ready: string[];
  testing: string[];
  testingHow: string;
  progress: number;
  questions: string[];
  blockers: string;
}): string {
  const { date, done, ready, testing, testingHow, progress, questions, blockers } = params;

  const bar = '▓'.repeat(Math.round(progress / 10)) +
              '░'.repeat(10 - Math.round(progress / 10));

  let msg = `<b>📋 Звіт ${date}</b>\n`;
  msg += `<b>Прогрес:</b> ${bar} ${progress}%\n\n`;

  if (done.length > 0) {
    msg += `<b>✅ Готово сьогодні:</b>\n`;
    done.forEach(d => msg += `• ${d}\n`);
    msg += '\n';
  }

  if (ready.length > 0) {
    msg += `<b>🟢 Можна використовувати:</b>\n`;
    ready.forEach(r => msg += `• ${r}\n`);
    msg += '\n';
  }

  if (testing.length > 0) {
    msg += `<b>🧪 На тестуванні:</b>\n`;
    testing.forEach(t => msg += `• ${t}\n`);
    if (testingHow) {
      msg += `\n<b>Як тестувати:</b>\n${testingHow}\n`;
    }
    msg += '\n';
  }

  if (blockers) {
    msg += `<b>⚠️ Блокери:</b>\n${blockers}\n\n`;
  }

  if (questions.length > 0) {
    msg += `<b>❓ Питання по ТЗ:</b>\n`;
    questions.forEach((q, i) => msg += `${i + 1}. ${q}\n`);
  }

  return msg.trim();
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📋 Starway Studio — Daily Report Generator');
  console.log('─'.repeat(44));

  // Збір даних
  console.log('\n✅ Що готово сьогодні (Enter після кожного, порожній Enter = кінець):');
  const done: string[] = [];
  while (true) {
    const item = await ask(`  ${done.length + 1}. `);
    if (!item) break;
    done.push(item);
  }

  console.log('\n🟢 Що можна вже використовувати (порожній Enter = кінець):');
  const ready: string[] = [];
  while (true) {
    const item = await ask(`  ${ready.length + 1}. `);
    if (!item) break;
    ready.push(item);
  }

  console.log('\n🧪 Що на тестуванні (порожній Enter = кінець):');
  const testing: string[] = [];
  while (true) {
    const item = await ask(`  ${testing.length + 1}. `);
    if (!item) break;
    testing.push(item);
  }

  let testingHow = '';
  if (testing.length > 0) {
    testingHow = await ask('\nЯк тестувати (одним реченням): ');
  }

  const progressRaw = await ask('\nПрогрес % (0-100): ');
  const progress = Math.min(100, Math.max(0, parseInt(progressRaw) || 0));

  const hasBlockers = await askYN('\nЄ блокери або залежності від замовника?');
  const blockers = hasBlockers ? await ask('Опиши коротко: ') : '';

  const hasQuestions = await askYN('\nЄ питання по ТЗ?');
  const questions: string[] = [];
  if (hasQuestions) {
    console.log('Питання (порожній Enter = кінець):');
    while (true) {
      const q = await ask(`  ${questions.length + 1}. `);
      if (!q) break;
      questions.push(q);
    }
  }

  const chatId = COACH_CHAT_ID || await ask('\nTelegram chat_id замовника: ');

  rl.close();

  // Будуємо і надсилаємо
  const report = buildReport({
    date: today(),
    done, ready, testing, testingHow,
    progress, questions, blockers,
  });

  const sent = await sendTelegram(chatId, report);

  if (sent) {
    console.log('\n✓ Звіт надіслано о ' +
      new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv' }));
  } else {
    console.log('\n→ Щоб надіслати — додай в .env:');
    console.log('  COACH_BOT_TOKEN=<токен коуч-бота>');
    console.log('  COACH_TELEGRAM_ID=<chat_id замовника>');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
