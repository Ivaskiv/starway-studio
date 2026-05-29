#!/usr/bin/env tsx
/**
 * scripts/new-bot.ts
 * Scaffold нового Telegram бота поверх існуючої інфраструктури.
 * Запуск: pnpm tsx scripts/new-bot.ts
 *
 * Робить автоматично:
 *   1. Додає PREFIX_BOT_TOKEN= в backend/.env.example
 *   2. Створює bot/content/NAME.content.ts
 *   3. Створює bot/handlers/NAME/start.handler.ts
 *   4. Створює bot/guards/NAME.middleware.ts (якщо потрібен guard)
 *   5. Патчить telegram.ts — додає новий bot proxy
 *   6. Патчить index.ts — додає реєстрацію + shutdown
 *   7. Виводить чекліст BotFather
 *   8. Виводить готовий Codex STEP промпт
 *
 * Єдине що лишається вручну: BotFather → токен → .env
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ─── helpers ────────────────────────────────────────────────────────────────

const REPO = path.resolve(__dirname, '..')
const BACKEND = path.join(REPO, 'backend/src')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
const ask = (q: string): Promise<string> =>
  new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())))

function toPascal(s: string) {
  return s
    .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase())
}

function banner(text: string) {
  console.log(`\n\x1b[36m── ${text}\x1b[0m`)
}

function ok(text: string) {
  console.log(`\x1b[32m  ✓\x1b[0m ${text}`)
}

function skip(text: string) {
  console.log(`\x1b[33m  ○\x1b[0m ${text} (вже існує — пропущено)`)
}

function writeIfNotExists(filePath: string, content: string, label: string) {
  if (fs.existsSync(filePath)) {
    skip(label)
    return
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  ok(label)
}

function appendIfNotContains(
  filePath: string,
  marker: string,
  content: string,
  label: string
) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ файл не знайдено: ${filePath}`)
    return
  }
  const src = fs.readFileSync(filePath, 'utf8')
  if (src.includes(marker)) {
    skip(label)
    return
  }
  fs.appendFileSync(filePath, '\n' + content, 'utf8')
  ok(label)
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m🤖 Starway Studio — New Bot Scaffold\x1b[0m')
  console.log('─'.repeat(44))

  // 1. Збір даних
  const displayName = await ask('Публічна назва бота (напр. Starway DNA): ')
  const username = await ask('Username без @ (напр. Starway_DNA_Bot): ')
  const envPrefix = await ask('.env prefix (напр. COACH → COACH_BOT_TOKEN): ')
  const roleRaw = await ask('Роль доступу [USER/EXPERT/SUPERADMIN/ANY]: ')
  const needChannel =
    (await ask("Потрібен пов'язаний канал? [y/n]: ")).toLowerCase() === 'y'
  const channelId = needChannel
    ? await ask('Channel .env var (напр. FOCUS_CHANNEL_ID): ')
    : ''

  rl.close()

  const role = roleRaw.toUpperCase() || 'EXPERT'
  const envVar = `${envPrefix.toUpperCase()}_BOT_TOKEN`
  const name = username
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/bot$/i, '')
    .toLowerCase()
  const Pascal = toPascal(name)
  const needGuard = role !== 'ANY' && role !== 'USER'

  // ─── 2. .env.example ──────────────────────────────────────────────────────
  banner('.env.example')
  const envExample = path.join(REPO, 'backend/.env.example')
  appendIfNotContains(
    envExample,
    envVar,
    `${envVar}=          # @${username}`,
    `${envVar}= в .env.example`
  )
  if (needChannel && channelId) {
    appendIfNotContains(
      envExample,
      channelId,
      `${channelId}=       # канал для ${displayName}`,
      `${channelId}= в .env.example`
    )
  }

  // ─── 3. content файл ──────────────────────────────────────────────────────
  banner('Content файл')
  const contentPath = path.join(BACKEND, `bot/content/${name}.content.ts`)
  writeIfNotExists(
    contentPath,
    `// ${displayName} — весь copy тут. Handlers імпортують звідси.
// Правило: НУЛЬ тексту в handlers.

export const ${name}Content = {
  welcome: \`Привіт! Це ${displayName}.\`,

  menu: {
    schedule:   'Мій розклад',
    analytics:  'ДНК аналітика',
    members:    'Учасники',
    notify:     'Нотифікації',
  },

  errors: {
    noAccess: 'Доступ заборонено.',
  },
} as const;
`,
    `bot/content/${name}.content.ts`
  )

  // ─── 4. guard middleware ───────────────────────────────────────────────────
  if (needGuard) {
    banner('Guard middleware')
    const guardPath = path.join(BACKEND, `bot/guards/${name}Only.middleware.ts`)
    writeIfNotExists(
      guardPath,
      `import type { Context } from 'telegraf';
import { prisma } from '../../lib/prisma';

/**
 * ${Pascal}Only guard
 * Дозволяє доступ тільки користувачам з роллю ${role}.
 * Якщо роль не відповідає — ігнорує (без відповіді).
 */
export async function ${name}Only(ctx: Context, next: () => Promise<void>) {
  const tgId = ctx.from?.id?.toString();
  if (!tgId) return;

  const user = await prisma.user.findFirst({
    where: { telegramUserId: tgId },
    select: { role: true },
  });

  const allowed: string[] = ['${role}'${role === 'EXPERT' ? ", 'SUPERADMIN'" : ''}];
  if (!user || !allowed.includes(user.role)) return;

  return next();
}
`,
      `bot/guards/${name}Only.middleware.ts`
    )
  }

  // ─── 5. start handler ─────────────────────────────────────────────────────
  banner('Start handler')
  const handlerDir = path.join(BACKEND, `bot/handlers/${name}`)
  const handlerPath = path.join(handlerDir, 'start.handler.ts')
  writeIfNotExists(
    handlerPath,
    `import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { ${name}Content as c } from '../../content/${name}.content';

/**
 * ${Pascal} /start handler — оркестрація only.
 * Весь copy імпортується з ${name}.content.ts.
 */
export async function ${name}StartHandler(ctx: Context) {
  await ctx.reply(c.welcome, Markup.inlineKeyboard([
    [Markup.button.callback(c.menu.schedule,  '${name}:schedule')],
    [Markup.button.callback(c.menu.analytics, '${name}:analytics')],
    [Markup.button.callback(c.menu.members,   '${name}:members')],
    [Markup.button.callback(c.menu.notify,    '${name}:notify')],
  ]));
}
`,
    `bot/handlers/${name}/start.handler.ts`
  )

  // ─── 6. telegram.ts patch hint ────────────────────────────────────────────
  banner('telegram.ts — потрібен ручний патч (або Codex STEP нижче)')
  const telegramTs = path.join(BACKEND, 'lib/telegram.ts')
  if (fs.existsSync(telegramTs)) {
    const src = fs.readFileSync(telegramTs, 'utf8')
    if (src.includes(envVar)) {
      skip(`${envVar} вже є в telegram.ts`)
    } else {
      console.log(`\x1b[33m  → Додай в telegram.ts:\x1b[0m`)
      console.log(`     let _${name}Bot: Telegraf | null = null;`)
      console.log(`     export function get${Pascal}Bot() {`)
      console.log(`       if (!_${name}Bot && process.env.${envVar}) {`)
      console.log(
        `         _${name}Bot = new Telegraf(process.env.${envVar}!);`
      )
      console.log(`       }`)
      console.log(`       return _${name}Bot;`)
      console.log(`     }`)
    }
  }

  // ─── 7. BotFather чекліст ─────────────────────────────────────────────────
  banner('Чекліст BotFather (вручну, 3 хв)')
  console.log(`
  1. Відкрий @BotFather
  2. /newbot
  3. Назва: ${displayName}
  4. Username: ${username}
  5. Скопіюй токен → встав в .env:
     ${envVar}=<TOKEN>
  6. /setdescription → @${username}
  7. /setuserpic → завантаж логотип (опційно)
  8. /setcommands → перелік команд
  `)

  // ─── 8. Codex STEP промпт ─────────────────────────────────────────────────
  banner('Готовий Codex STEP — скопіюй і передай')
  const stepNum = 'NN'
  console.log(`
\x1b[90m${'─'.repeat(56)}\x1b[0m
STEP ${stepNum} — integrate ${name} bot into telegram.ts + index.ts

Context:
- Repo: /Users/viravira/Documents/starway-studio
- Файли:
  backend/src/lib/telegram.ts
  backend/src/index.ts
  backend/src/bot/handlers/${name}/start.handler.ts
  backend/src/bot/guards/${name}Only.middleware.ts
- Стан: content + handler + guard створено скриптом.
  Залишилось підключити до shared infra.

Task:
1. telegram.ts — додати lazy proxy для ${envVar}:
   let _${name}Bot: Telegraf | null = null
   export function get${Pascal}Bot(): Telegraf | null {
     if (!_${name}Bot && process.env.${envVar})
       _${name}Bot = new Telegraf(process.env.${envVar}!)
     return _${name}Bot
   }

2. index.ts — в bootstrap блоці після mainBot реєстрації:
   const ${name}Bot = get${Pascal}Bot()
   if (${name}Bot) {
     ${name}Bot.use(${name}Only)
     ${name}Bot.start(${name}StartHandler)
     ${name}Bot.launch()
     console.log('✓ ${displayName} bot running')
   }

3. index.ts — в shutdown блоці:
   ${name}Bot?.stop('SIGTERM')

4. pnpm -C backend exec tsc --noEmit

Rules:
- Оптимізувати поверх існуючого telegram.ts — no новий файл
- Copy → ${name}.content.ts (вже є)
- Handler → оркестрація (вже є)
- Guard → ${name}Only.middleware.ts (вже є)
- tsc --noEmit green
\x1b[90m${'─'.repeat(56)}\x1b[0m
`)

  console.log('\x1b[32m✓ Scaffold завершено.\x1b[0m')
  console.log(
    '  Наступний крок: встав токен в .env → запусти Codex STEP вище.\n'
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

