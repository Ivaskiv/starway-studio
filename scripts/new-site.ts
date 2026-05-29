#!/usr/bin/env tsx
/**
 * scripts/new-site.ts
 * Аналізує складність сайту → обирає стратегію → scaffold + deploy Vercel.
 * Запуск: pnpm tsx scripts/new-site.ts
 *
 * Три шляхи:
 *   SIMPLE  → генерує HTML+Tailwind → deploy vercel --prod (без домену → *.vercel.app)
 *   MEDIUM  → генерує Codex STEP для Next.js → deploy vercel
 *   COMPLEX → генерує промпт для Lovable або Codex STEP з Figma
 *
 * Єдине ручне: якщо нема домену — показує URL + умови → чекає OK.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';

// ─── helpers ─────────────────────────────────────────────────────────────────

const REPO    = path.resolve(__dirname, '..');
const SITES   = path.join(REPO, 'apps');
const SCRIPTS = path.join(REPO, 'scripts');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> =>
  new Promise(resolve => rl.question(q, a => resolve(a.trim())));

const askYN = async (q: string) =>
  (await ask(`${q} [y/n]: `)).toLowerCase() === 'y';

function banner(t: string) { console.log(`\n\x1b[36m── ${t}\x1b[0m`); }
function ok(t: string)     { console.log(`\x1b[32m  ✓\x1b[0m ${t}`); }
function warn(t: string)   { console.log(`\x1b[33m  !\x1b[0m ${t}`); }
function info(t: string)   { console.log(`\x1b[90m  ${t}\x1b[0m`); }
function hr()              { console.log('\x1b[90m' + '─'.repeat(56) + '\x1b[0m'); }

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function tryExec(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim(); }
  catch { return ''; }
}

// ─── complexity engine ───────────────────────────────────────────────────────

type Complexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX';

interface SiteAnswers {
  clientName:  string;
  projectName: string;
  siteSlug:    string;
  type:        string;   // landing | multipage | webapp
  sections:    number;
  hasFigma:    boolean;
  figmaUrl:    string;
  hasDomain:   boolean;
  domain:      string;
  lang:        string;
  framework:   string;   // html | nextjs | auto
  deploy:      boolean;
}

function analyzeComplexity(a: SiteAnswers): Complexity {
  if (a.hasFigma || a.type === 'webapp') return 'COMPLEX';
  if (a.type === 'multipage' || a.sections > 6) return 'MEDIUM';
  return 'SIMPLE';
}

function complexityLabel(c: Complexity): string {
  return {
    SIMPLE:  '✦ SIMPLE  — HTML + Tailwind → Vercel (авто-deploy)',
    MEDIUM:  '✦ MEDIUM  — Next.js → Vercel (Codex STEP)',
    COMPLEX: '✦ COMPLEX — Figma/WebApp → Lovable промпт або Codex STEP',
  }[c];
}

// ─── SIMPLE: генерація HTML лендінгу ─────────────────────────────────────────

function generateLanding(a: SiteAnswers): string {
  const dir = path.join(SITES, a.siteSlug);
  fs.mkdirSync(dir, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="${a.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${a.projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --accent: #7c6fff;
      --bg: #0e0e10;
      --surface: #18181c;
      --text: #f0f0f4;
      --muted: #7a7a8c;
    }
    body { background: var(--bg); color: var(--text); }
    .btn-primary {
      background: var(--accent);
      color: #fff;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      transition: opacity .2s;
    }
    .btn-primary:hover { opacity: .88; }
  </style>
</head>
<body class="font-sans antialiased">

  <!-- Hero -->
  <section class="min-h-screen flex flex-col items-center justify-center text-center px-6">
    <p class="text-sm font-semibold tracking-widest mb-4" style="color:var(--accent)">
      ${a.clientName.toUpperCase()}
    </p>
    <h1 class="text-4xl md:text-6xl font-bold mb-6 max-w-3xl leading-tight">
      ${a.projectName}
    </h1>
    <p class="text-lg mb-10 max-w-xl" style="color:var(--muted)">
      TODO: головний меседж — що отримає клієнт
    </p>
    <button class="btn-primary">TODO: CTA кнопка</button>
  </section>

  <!-- TODO: додай секції нижче -->
  <!-- Секція 2: Переваги / Features -->
  <!-- Секція 3: Як це працює -->
  <!-- Секція 4: Відгуки -->
  <!-- Секція 5: CTA / Ціна -->
  <!-- Footer -->

</body>
</html>`;

  const indexPath = path.join(dir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');
  ok(`apps/${a.siteSlug}/index.html створено`);
  return dir;
}

// ─── vercel deploy ────────────────────────────────────────────────────────────

async function vercelDeploy(dir: string, a: SiteAnswers): Promise<string> {
  banner('Vercel deploy');

  // Перевіряємо чи є vercel CLI
  const vercelVersion = tryExec('vercel --version');
  if (!vercelVersion) {
    warn('Vercel CLI не знайдено. Встанови: npm i -g vercel');
    warn('Після встановлення: cd ' + dir + ' && vercel --prod');
    return '';
  }

  if (!a.hasDomain) {
    console.log(`
\x1b[33m┌─ УВАГА: домен не вказано ─────────────────────────────────┐
│                                                            │
│  Сайт буде розміщено на безкоштовному Vercel URL:         │
│  https://${a.siteSlug}-XXXX.vercel.app                    │
│                                                            │
│  Умови безкоштовного Vercel Hobby плану:                  │
│  • 100 GB bandwidth / місяць                              │
│  • Кастомний домен можна підключити пізніше               │
│  • SSL включено                                            │
│  • Немає SLA                                               │
│                                                            │
│  Для кастомного домену: vercel domains add DOMAIN         │
└────────────────────────────────────────────────────────────┘\x1b[0m`);

    const confirmed = await askYN('Продовжити deploy без домену?');
    if (!confirmed) {
      info('Deploy скасовано. Запусти вручну: cd apps/' + a.siteSlug + ' && vercel --prod');
      return '';
    }
  }

  info('Запускаю vercel deploy...');
  try {
    const output = execSync(
      `cd "${dir}" && vercel --prod --yes --name ${a.siteSlug}`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
    const url = urlMatch ? urlMatch[0] : '';
    if (url) {
      ok(`Розміщено: ${url}`);
      if (a.hasDomain && a.domain) {
        info(`Підключи домен: vercel domains add ${a.domain} --project ${a.siteSlug}`);
      }
      return url;
    }
  } catch (e: any) {
    warn('Deploy помилка: ' + e.message);
    info('Спробуй вручну: cd apps/' + a.siteSlug + ' && vercel --prod');
  }
  return '';
}

// ─── вивід промптів для MEDIUM / COMPLEX ─────────────────────────────────────

function printMediumStep(a: SiteAnswers) {
  hr();
  console.log(`
STEP NN — scaffold ${a.siteSlug} Next.js site → Vercel

Context:
- Repo: /Users/viravira/Documents/starway-studio
- Новий додаток: apps/${a.siteSlug}/
- Deploy: Vercel (вже налаштований для apps/web)
- Домен: ${a.hasDomain ? a.domain : 'ні → *.vercel.app'}

Task:
1. cd apps && pnpm create next-app ${a.siteSlug} --ts --tailwind --app --no-src-dir
2. Структура сторінок відповідно до ТЗ замовника
3. vercel.json в корені apps/${a.siteSlug}/ якщо потрібний custom routing
4. cd apps/${a.siteSlug} && vercel --prod --name ${a.siteSlug}${a.hasDomain ? `\n5. vercel domains add ${a.domain} --project ${a.siteSlug}` : ''}

Rules:
- Zero inline styles — Tailwind + CSS vars
- Zero backdrop-filter
- Компоненти в components/, контент в content/
- No нових файлів якщо можна оновити існуючий
- tsc --noEmit green`);
  hr();
}

function printComplexStep(a: SiteAnswers) {
  hr();
  if (a.hasFigma) {
    console.log(`
=== ВАРІАНТ A: Lovable (допіксельно з Figma) ===

1. Відкрий https://lovable.dev
2. "Import from Figma" → встав URL: ${a.figmaUrl}
3. Промпт для Lovable:

---
Реалізуй сайт "${a.projectName}" для ${a.clientName}.
Figma: ${a.figmaUrl}

Вимоги:
- Допіксельна реалізація макету
- Tailwind CSS, TypeScript
- Адаптивна верстка (mobile-first)
- Zero inline styles
- Всі кольори через CSS custom properties
- Deploy на Vercel після завершення
---

=== ВАРІАНТ B: Codex STEP (якщо Figma export є локально) ===

STEP NN — build ${a.siteSlug} from Figma

Context:
- Repo: /Users/viravira/Documents/starway-studio
- Figma: ${a.figmaUrl}
- Figma export: [покласти PNG/SVG в docs/design/${a.siteSlug}/]

Task:
1. Проаналізуй Figma export з docs/design/${a.siteSlug}/
2. Scaffold apps/${a.siteSlug}/ як Next.js + Tailwind
3. Реалізуй кожну секцію допіксельно
4. vercel deploy → ${a.hasDomain ? a.domain : a.siteSlug + '.vercel.app'}

Rules:
- Zero inline styles, zero backdrop-filter
- CSS vars для всіх кольорів з Figma tokens
- tsc --noEmit green`);
  } else {
    console.log(`
STEP NN — build ${a.siteSlug} webapp

Context:
- Repo: /Users/viravira/Documents/starway-studio
- Тип: ${a.type}
- Домен: ${a.hasDomain ? a.domain : '*.vercel.app'}

Task:
1. Scaffold apps/${a.siteSlug}/ — Next.js + Tailwind + TypeScript
2. Реалізуй функціональність відповідно до ТЗ
3. API routes в apps/${a.siteSlug}/app/api/ якщо потрібно
4. Підключи до існуючого backend якщо потрібна БД
5. vercel deploy --name ${a.siteSlug}

Rules:
- Оптимізувати поверх, не поруч — перевір чи є схожий код в apps/web
- Zero inline styles, zero backdrop-filter
- tsc --noEmit green`);
  }
  hr();
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m🌐 Starway Studio — New Site Scaffold\x1b[0m');
  hr();

  // 1. Збір даних
  banner('Дані замовника');
  const clientName  = await ask('Ім\'я / назва проекту: ');
  const projectName = await ask('Назва сайту (публічна): ');
  const siteSlug    = slug(await ask(`Slug (папка apps/___): [${slug(projectName)}] `) || projectName);
  const lang        = await ask('Мова [uk/en]: ') || 'uk';

  banner('Тип сайту');
  console.log('  1 — Лендінг (1 сторінка)');
  console.log('  2 — Багатосторінковий сайт');
  console.log('  3 — Веб-застосунок (webapp)');
  const typeNum    = await ask('Обери [1/2/3]: ');
  const typeMap    = { '1': 'landing', '2': 'multipage', '3': 'webapp' };
  const type       = typeMap[typeNum as keyof typeof typeMap] || 'landing';
  const sectionsRaw = await ask('Кількість секцій / сторінок (приблизно): ');
  const sections   = parseInt(sectionsRaw) || 3;

  banner('Figma та домен');
  const hasFigma   = await askYN('Є Figma макет?');
  const figmaUrl   = hasFigma ? await ask('Figma URL: ') : '';
  const hasDomain  = await askYN('Є власний домен?');
  const domain     = hasDomain ? await ask('Домен (напр. starway.studio): ') : '';
  const doDeploy   = await askYN('Запустити deploy після scaffold?');

  rl.close();

  const answers: SiteAnswers = {
    clientName, projectName, siteSlug, type, sections,
    hasFigma, figmaUrl, hasDomain, domain, lang,
    framework: 'auto', deploy: doDeploy,
  };

  // 2. Аналіз складності
  const complexity = analyzeComplexity(answers);

  banner('Аналіз складності');
  console.log(`\n  ${complexityLabel(complexity)}\n`);
  console.log(`  Підстава:`);
  if (hasFigma)          info('  Figma макет → COMPLEX (допіксельна верстка)');
  if (type === 'webapp') info('  Тип webapp → COMPLEX');
  if (type === 'multipage' || sections > 6) info(`  ${sections} секцій / multipage → MEDIUM`);
  if (complexity === 'SIMPLE') info('  Лендінг до 6 секцій, без Figma → SIMPLE HTML+Tailwind');

  // 3. Дія по складності
  if (complexity === 'SIMPLE') {
    banner('Scaffold HTML лендінгу');
    const dir = generateLanding(answers);

    // Зберігаємо site-config
    const configPath = path.join(dir, 'site.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      projectName, clientName, siteSlug, domain: domain || null,
      createdAt: new Date().toISOString(), complexity,
    }, null, 2), 'utf8');
    ok(`apps/${siteSlug}/site.config.json`);

    if (doDeploy) {
      const url = await vercelDeploy(dir, answers);
      if (url) {
        banner('Готово');
        ok(`URL: ${url}`);
        if (!hasDomain) warn('Підключи домен пізніше: vercel domains add DOMAIN --project ' + siteSlug);
      }
    } else {
      info('Deploy пропущено. Запусти вручну:');
      info(`  cd apps/${siteSlug} && vercel --prod`);
    }

    banner('Наступні кроки');
    console.log(`
  1. Відкрий apps/${siteSlug}/index.html — заміни TODO секції
  2. Додай реальний контент (тексти, зображення)
  3. Deploy: cd apps/${siteSlug} && vercel --prod
  4. Домен (якщо є): vercel domains add ${domain || 'YOUR_DOMAIN'} --project ${siteSlug}
    `);

  } else if (complexity === 'MEDIUM') {
    banner('Codex STEP для Next.js');
    printMediumStep(answers);
    info('Скопіюй STEP вище і передай в Claude Code / Codex');

  } else {
    banner('Стратегія для COMPLEX');
    printComplexStep(answers);
    info('Обери варіант A (Lovable) або B (Codex STEP)');
  }

  console.log('\n\x1b[32m✓ Scaffold завершено.\x1b[0m\n');
}

main().catch(e => { console.error(e); process.exit(1); });
