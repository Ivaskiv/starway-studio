import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DailyChoice,
  DailyState,
  NotificationChannel,
  NotificationStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
  SubscriptionStatus,
} from '../generated/client/index.js';
import type {
  Role as RoleType,
  SubscriptionStatus as SubscriptionStatusType,
  User,
} from '../generated/client/index.js';

type SeedUserInput = {
  key: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: RoleType;
  telegramUserId?: string;
  telegramUserName?: string;
  subscriptionStatus: SubscriptionStatusType;
  trialDays?: number;
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const backendEnvPath = resolve(currentDirPath, '../../../backend/.env');
const rootEnvPath = resolve(currentDirPath, '../../../.env');
if (existsSync(rootEnvPath)) {
  loadEnv({ path: rootEnvPath });
}
if (existsSync(backendEnvPath)) {
  loadEnv({ path: backendEnvPath, override: true });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for seed');

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

async function main() {
  console.log('🌱 Seeding AI-only SaaS schema...\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. SuperAdmin
 const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'viraivaskiv@gmail.com' },
    update: { name: 'Platform Admin' },
    create: { email: 'viraivaskiv@gmail.com', name: 'Platform Admin' },
  });
  console.log(`✅ SuperAdmin: ${superAdmin.email}`);

  // 2. Expert
const expert = await prisma.expert.upsert({
    where: { email: 'nadyastarway@gmail.com' },
    update: { displayName: 'Starway Expert', timezone: 'Europe/Kyiv', isActive: true },
    create: {
      email: 'nadyastarway@gmail.com',
      displayName: 'Starway Expert',
      timezone: 'Europe/Kyiv',
      telegramBotName: 'starway_expert_bot',
    },
  });
  console.log(`✅ Expert: ${expert.email}`);

  // 3. Користувачі
 const usersData: SeedUserInput[] = [
    {
      key: 'trial',
      email: 'trial@starway.com',
      firstName: 'Trial',
      role: Role.USER,
      telegramUserId: '10000001',
      telegramUserName: 'trial_user',
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialDays: 7,
    },
    {
      key: 'paid',
      email: 'paid@starway.com',
      firstName: 'Paid',
      role: Role.USER,
      telegramUserId: '10000002',
      telegramUserName: 'paid_user',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
    {
      key: 'mentor',
      email: 'mentor@starway.com',
      firstName: 'Mentor',
      role: Role.EXPERT,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  ];

  const users = new Map<string, User>();

  // Upsert користувачів
  for (const item of usersData) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        firstName: item.firstName,
        lastName: item.lastName ?? null,
        telegramUserId: item.telegramUserId ?? null,
        telegramUserName: item.telegramUserName ?? null,
      },
      create: {
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName ?? null,
        telegramUserId: item.telegramUserId ?? null,
        telegramUserName: item.telegramUserName ?? null,
        role: item.role,
        passwordHash: item.role === Role.USER ? passwordHash : null,
        expertId: expert.id,
        uiSettings: {
          accentColor: '#0c1d32',
          theme: 'dark',
          language: 'uk',
        },
        progress: {
          create: {
            totalPoints: 0,
            completedBlocks: 0,
            level: 1,
          },
        },
      },
    });

    users.set(item.key, user);
    console.log(`✅ User: ${item.email}`);

// Subscription (створюємо тільки якщо нема)
const existingSub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          expertId: expert.id,
          status: item.subscriptionStatus,
          planCode: item.subscriptionStatus === SubscriptionStatus.TRIAL ? 'TRIAL' : 'MONTHLY_BASIC',
          startsAt: new Date(),
          trialEndsAt:
            item.subscriptionStatus === SubscriptionStatus.TRIAL
              ? new Date(Date.now() + (item.trialDays ?? 7) * 24 * 60 * 60 * 1000)
              : null,
          currentPeriodEnd:
            item.subscriptionStatus === SubscriptionStatus.ACTIVE
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              : null,
          autoRenew: true,
        },
      });
      console.log(`   └─ Subscription: ${item.subscriptionStatus}`);
    }
  }  
  const trialUser = users.get('trial')!;
  const paidUser = users.get('paid')!;

  // 4. Funnel
  const funnel = await prisma.funnel.upsert({
    where: { expertId_slug: { expertId: expert.id, slug: 'balance-trial-subscription' } },
    update: { name: 'Balance → Trial → Subscription', isActive: true, status: 'draft' },
    create: {
      expertId: expert.id,
      slug: 'balance-trial-subscription',
      name: 'Balance → Trial → Subscription',
      ownerId: paidUser.id,
      code: 'balance-trial',
      definition: { steps: ['balance', 'trial', 'subscription', 'upsell'] },
      status: 'draft',
      isActive: true,
    },
  });
  console.log(`✅ Funnel: ${funnel.slug}`);

  // 5. Product
  const product = await prisma.product.upsert({
    where: { code: 'starter-product' },
    update: { name: 'Starter Product', priceCents: 4990 },
    create: {
      code: 'starter-product',
      ownerId: paidUser.id,
      expertId: expert.id,
      name: 'Starter Product',
      description: 'Seeded product for onboarding',
      priceCents: 4990,
      currency: 'EUR',
      durationDays: 30,
      features: { wheel: true },
      limits: { wheel: 1 },
    },
  });
  console.log(`✅ Product: ${product.code}`);

  // 6. FunnelProduct
  await prisma.funnelProduct.upsert({
    where: { funnelId_productId: { funnelId: funnel.id, productId: product.id } },
    update: {},
    create: { funnelId: funnel.id, productId: product.id },
  });
  console.log(`   └─ Attached product to funnel`);

  // 7. Course
  const course = await prisma.course.upsert({
    where: { code: 'balance-mini-course' },
    update: { name: 'Balance Mini Course' },
    create: { code: 'balance-mini-course', name: 'Balance Mini Course', description: 'Guided wheel of balance curriculum' },
  });
  console.log(`✅ Course: ${course.code}`);

  // 8. AiMentor
  const aiMentor = await prisma.aiMentor.upsert({
    where: { expertId_slug: { expertId: expert.id, slug: 'daily-core-mentor' } },
    update: { name: 'Daily Core Mentor', niche: 'Mindset & Productivity', isPublished: true },
    create: {
      expertId: expert.id,
      slug: 'daily-core-mentor',
      name: 'Daily Core Mentor',
      niche: 'Mindset & Productivity',
      isPublished: true,
      generatorConfig: {
        persona: { tone: 'supportive', style: 'pragmatic' },
        stages: [{ key: 'intro', goal: 'daily check-in' }, { key: 'focus', goal: 'single next action' }],
      },
      runtimeConfig: { promptVersion: 1, rules: ['short actionable advice', 'no medical/legal claims'] },
    },
  });
  console.log(`✅ ABsystem: ${aiMentor.slug}`);

  // 9. BalanceWheelConfig
  let balanceConfig = await prisma.balanceWheelConfig.findFirst({
    where: { expertId: expert.id, name: 'Default 8 Sphere Wheel', deletedAt: null },
  });
  if (!balanceConfig) {
    balanceConfig = await prisma.balanceWheelConfig.create({
      data: {
        expertId: expert.id,
        name: 'Default 8 Sphere Wheel',
        isDefault: true,
        version: 1,
        spheres: [
          { key: 'health', label: 'Health' },
          { key: 'career', label: 'Career' },
          { key: 'finance', label: 'Finance' },
          { key: 'relationships', label: 'Relationships' },
          { key: 'family', label: 'Family' },
          { key: 'growth', label: 'Growth' },
          { key: 'recreation', label: 'Recreation' },
          { key: 'purpose', label: 'Purpose' },
        ],
      },
    });
  }
  console.log(`✅ Balance Config: ${balanceConfig.name}`);

  // 10. Решта для кожного USER
  for (const item of usersData.filter(u => u.role === Role.USER)) {
    const user = users.get(item.key)!;

    // UserMentorState
    await prisma.userMentorState.upsert({
      where: { expertId_userId_aiMentorId: { expertId: expert.id, userId: user.id, aiMentorId: aiMentor.id } },
      update: { currentStep: 'intro', context: { seeded: true } },
      create: { expertId: expert.id, userId: user.id, aiMentorId: aiMentor.id, currentStep: 'intro', context: { seeded: true } },
    });

    // BalanceEntry
    const existingBalanceEntry = await prisma.userBalanceEntry.findFirst({
      where: { expertId: expert.id, userId: user.id, balanceConfigId: balanceConfig.id },
    });
    if (!existingBalanceEntry) {
      await prisma.userBalanceEntry.create({
        data: {
          expertId: expert.id,
          userId: user.id,
          aiMentorId: aiMentor.id,
          balanceConfigId: balanceConfig.id,
          scores: { health: 6, career: 7, finance: 5, relationships: 7, family: 8, growth: 6, recreation: 5, purpose: 7 },
          note: 'Initial seeded balance snapshot',
        },
      });
    }

    // Enrollment
    await prisma.enrollment.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      update: { enrolledAt: new Date() },
      create: {
        userId: user.id,
        productId: product.id,
        enrolledAt: new Date(),
        purchased: item.subscriptionStatus === SubscriptionStatus.ACTIVE,
        trialEnd: item.subscriptionStatus === SubscriptionStatus.TRIAL ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // CourseEnrollment
    await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: { completedAt: null },
      create: { userId: user.id, courseId: course.id, completedAt: null },
    });

    // TelegramLink
    await prisma.telegramLink.upsert({
      where: { code: `seed-${user.id}` },
      update: { code: `seed-${user.id}` },
      create: { userId: user.id, code: `seed-${user.id}`, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    // Streak
    await prisma.streak.upsert({
      where: { userId_ruleKey: { userId: user.id, ruleKey: 'daily_checkin' } },
      update: { endAt: new Date() },
      create: {
        userId: user.id,
        expertId: expert.id,
        startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastAt: new Date(),
        endAt: null,
        current: 5,
        longest: 5,
        totalDays: 5,
        ruleKey: 'daily_checkin',
        ruleVer: 1,
      },
    });

    // DailyEntry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyEntry.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: { content: { mood: 'steady' } },
      create: { userId: user.id, expertId: expert.id, content: { mood: 'steady', focus: 'balance' }, date: today, state: DailyState.NEUTRAL, choice: DailyChoice.PENDING },
    });

    // MicroTask
    await prisma.trialMirror.upsert({
      where: { userId_day: { userId: user.id, day: 4 } },
      update: { analysis: 'Seed mirror (day 4)', entries: 1 },
      create: {
        userId: user.id,
        day: 4,
        analysis: 'Seed mirror (day 4)',
        entries: 1,
      },
    });

    await prisma.microTask.upsert({
      where: { id: `${user.id}-micro` },
      update: {
        sphere: 'growth',
        isCompleted: true,
        completedAt: new Date(),
      },
      create: {
        id: `${user.id}-micro`,
        title: 'Seed micro task',
        userId: user.id,
        expertId: expert.id,
        sphere: 'growth',
        isCompleted: true,
        completedAt: new Date(),
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    // PaymentLog
    await prisma.paymentLog.upsert({
      where: { id: `${user.id}-payment` },
      update: { status: PaymentStatus.SUCCESS },
      create: {
        id: `${user.id}-payment`,
        userId: user.id,
        expertId: expert.id,
        amountCents: 4990,
        currency: 'EUR',
        status: item.subscriptionStatus === SubscriptionStatus.TRIAL ? PaymentStatus.PENDING : PaymentStatus.SUCCESS,
        metadata: { planCode: item.subscriptionStatus === SubscriptionStatus.TRIAL ? 'trial_7' : 'monthly_basic' },
      },
    });
  }

  // Queued notification
  const existingQueuedNotification = await prisma.notification.findFirst({
    where: { expertId: expert.id, userId: trialUser.id, channel: NotificationChannel.TELEGRAM, templateKey: 'daily_nudge', status: NotificationStatus.PENDING },
  });
  if (!existingQueuedNotification) {
    await prisma.notification.create({
      data: { expertId: expert.id, userId: trialUser.id, channel: NotificationChannel.TELEGRAM, templateKey: 'daily_nudge', payload: { text: 'Seed reminder: start your check-in.' }, status: NotificationStatus.PENDING, scheduledAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
  }

  // ── ДНК STARWAY: профіль поведінки ─────────────────────────────────
  const aiProfile = await prisma.aiBehaviorProfile.upsert({
    where:  { key: 'STARWAY_OGOLENA_PRAVDA' },
    update: {},
    create: {
      key:         'STARWAY_OGOLENA_PRAVDA',
      name:        'Оголена правда STARWAY',
      description: 'Психолінгвістика + тригерна мова + 5-кроковий алгоритм Хоменко',
      systemAnchor:
        'Ти — AI-асистент психолінгвістики STARWAY. Ти не пишеш тексти.' +
        ' Ти оголюєш правду і змушуєш ДІЯТИ.' +
        ' Зроби так, як би зробила АНЯ ХОМЕНКО, але з масштабом STARWAY.',
      version: 1,
      cascadeOrder: ['CLAUDE', 'GPT4O', 'GEMINI', 'LLAMA3', 'FALLBACK_TEMPLATE'],
      supportedOutputs: [
        'WARMUP_1DAY','WARMUP_3DAYS','WARMUP_WEEK','WARMUP_LAUNCH',
        'REELS_SCENARIO','WEBINAR_SALES','LIVE_STRUCTURE',
        'BLOG_IDEAS','STORIES_CHECK','CUSTOM',
      ],
      supportedProtocols: {
        SYSTEM: 'Оголена правда. Розбий ілюзії аудиторії в лоб.',
        AUTHOR: 'Пиши як Архітектор STARWAY. Позиція сили, масштаб.',
        PSYCH:  'Фільтр Психології Дії. Випали хорошу дівчинку.',
      },
    },
  });

  const aiTooltips = [
    { elementKey: 'RADIO_SYSTEM', title: 'Оголена правда',
      whatItDoes: 'Розбиває ілюзії. Провокативний тон.',
      howToUse:   'Для холодної аудиторії та перших прогрівів.' },
    { elementKey: 'RADIO_AUTHOR', title: 'Авторський',
      whatItDoes: 'Транслює позицію сили, масштабу, харизми.',
      howToUse:   'Для дорогих продуктів та наставництва.' },
    { elementKey: 'RADIO_PSYCH',  title: 'Психологія дії',
      whatItDoes: 'Виймає внутрішній затик. Аудит без цензури.',
      howToUse:   'Для STORIES_CHECK та перевірки контенту.' },
  ];
  for (const t of aiTooltips) {
    await prisma.aiTooltip.upsert({
      where:  { profileId_elementKey: { profileId: aiProfile.id, elementKey: t.elementKey } },
      update: {},
      create: { profileId: aiProfile.id, ...t },
    });
  }
  console.log(`✅ AI Profile: ${aiProfile.key}`);

  const nadiya = await prisma.user.findUnique({ where: { email: 'nadyastarway@gmail.com' } });
  if (nadiya) {
    await prisma.userAiWorkspace.upsert({
      where:  { userId: nadiya.id },
      update: { isActive: true, activeProfileId: aiProfile.id },
      create: {
        userId:            nadiya.id,
        isActive:          true,
        activeProfileId:   aiProfile.id,
        allowedModels:     ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-1.5-pro'],
        maxTokensPerMonth: 2_000_000,
      },
    });
    await prisma.user.update({
      where: { id: nadiya.id },
      data:  { role: Role.ADMIN },
    });
    console.log('✅ ДНК STARWAY активовано для nadyastarway@gmail.com');
  } else {
    console.warn('⚠️  nadyastarway@gmail.com не знайдено — запустіть seed після реєстрації');
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] as any[] } },
    select: { id: true, email: true },
  });
  for (const admin of admins) {
    const existing = await prisma.userAiWorkspace.findUnique({ where: { userId: admin.id } });
    if (!existing) {
      await prisma.userAiWorkspace.create({
        data: {
          userId:            admin.id,
          isActive:          true,
          activeProfileId:   aiProfile.id,
          allowedModels:     ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-1.5-pro'],
          maxTokensPerMonth: 10_000_000,
        },
      });
      console.log(`✅ AI workspace створено для ${admin.email}`);
    }
  }

  // ── Початковий Лексикон ─────────────────────────────────────────────
  const initLex = [
    { type: 'REQUIRED'  as const, word: 'тригер'                },
    { type: 'REQUIRED'  as const, word: 'масштаб'               },
    { type: 'REQUIRED'  as const, word: 'застрягла'             },
    { type: 'REQUIRED'  as const, word: 'зливати'               },
    { type: 'REQUIRED'  as const, word: 'тупняк'                },
    { type: 'REQUIRED'  as const, word: 'готово'                },
    { type: 'FORBIDDEN' as const, word: 'унікальна можливість'  },
    { type: 'FORBIDDEN' as const, word: 'трансформація'         },
    { type: 'FORBIDDEN' as const, word: 'успішний успіх'        },
    { type: 'FORBIDDEN' as const, word: 'результат гарантовано' },
    { type: 'FORBIDDEN' as const, word: 'просто почни'          },
    { type: 'FORBIDDEN' as const, word: 'не хочу'               },
  ];
  await prisma.lexicon.createMany({
    data: initLex.map(l => ({
      id:         `seed-${l.word.replace(/\s+/g, '-')}`,
      profileKey: 'STARWAY_OGOLENA_PRAVDA',
      type:       l.type,
      word:       l.word,
      addedBy:    'seed',
    })),
    skipDuplicates: true,
  });
  console.log('✅ Lexicon: 6 REQUIRED + 6 FORBIDDEN ініціалізовано');

  // JWT tokens
  console.log('\n🎉 Seed completed. JWT tokens:');
  for (const item of usersData) {
    const user = users.get(item.key)!;
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, expertId: expert.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`${item.email} -> ${accessToken}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
