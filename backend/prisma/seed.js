import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus, } from '../src/db/generated/client.js';
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
async function main() {
    console.log('🌱 Seeding...\n');
    const hash = await bcrypt.hash('password123', 10);
    const users = {};
    // ======================
    // USERS
    // ======================
    const usersData = [
        {
            email: 'trial@starway.com',
            firstName: 'Trial',
            role: UserRole.USER,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            subscriptionPlan: SubscriptionPlan.TRIAL,
            trialDays: 7,
        },
        {
            email: 'paid@starway.com',
            firstName: 'Paid',
            role: UserRole.USER,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: SubscriptionPlan.MONTHLY,
        },
        {
            email: 'admin@starway.com',
            firstName: 'Admin',
            role: UserRole.ADMIN,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: SubscriptionPlan.MONTHLY,
        },
        {
            email: 'nadyastarway@gmail.com',
            firstName: 'Nadya',
            role: UserRole.USER,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: SubscriptionPlan.MONTHLY,
        },
    ];
    for (const u of usersData) {
        const trialStarted = u.trialDays ? new Date() : null;
        const trialEnds = u.trialDays ? new Date(Date.now() + u.trialDays * 24 * 60 * 60 * 1000) : null;
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                passwordHash: hash,
                firstName: u.firstName,
                role: u.role,
                subscriptionStatus: u.subscriptionStatus,
                subscriptionPlan: u.subscriptionPlan,
                trialStartedAt: trialStarted,
                trialEndsAt: trialEnds,
            },
        });
        const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
            expiresIn: '7d',
        });
        users[u.email] = { ...user, accessToken };
        console.log(`✅ User created: ${user.email}`);
    }
    // ======================
    // PRODUCTS
    // ======================
    const productsData = [
        {
            code: 'daily_trial_7',
            name: 'Trial 7 Days',
            description: 'Безкоштовний доступ на 7 днів',
            priceCents: 0,
            features: { daily: true, microTasks: true },
            limits: { dailyPerDay: 1, historyDays: 7 },
            ownerId: users['trial@starway.com'].id,
        },
        {
            code: 'daily_basic',
            name: 'Basic Plan',
            description: 'Преміум доступ для щоденних практик',
            priceCents: 500,
            features: { daily: true, microTasks: true, aiAnalysis: true },
            limits: { dailyPerDay: 2, microTasksActive: 5 },
            ownerId: users['paid@starway.com'].id,
        },
        {
            code: 'daily_pro',
            name: 'Pro Plan',
            description: 'Розширені курси та AI ментор',
            priceCents: 1200,
            features: { daily: true, microTasks: true, aiAnalysis: true, wheel: true },
            limits: { dailyPerDay: 5, microTasksActive: 10 },
            ownerId: users['admin@starway.com'].id,
        },
        {
            code: 'daily_nadya',
            name: 'Nadya Special',
            description: 'Тестовий продукт для Nadya',
            priceCents: 700,
            features: { daily: true, microTasks: true },
            limits: { dailyPerDay: 3, microTasksActive: 5 },
            ownerId: users['nadyastarway@gmail.com'].id,
        },
    ];
    const products = [];
    for (const p of productsData) {
        const product = await prisma.product.upsert({ where: { code: p.code }, update: {}, create: p });
        products.push(product);
    }
    console.log('✅ Products created');
    // ======================
    // VIDEO SERIES
    // ======================
    const videoSeriesData = [
        {
            code: 'video_1',
            title: 'АЛГОРИТМ ВИХОДУ ІЗ ЗАСТОЮ',
            messages: ['Ти побачиш, чому роки спроб не дають зрушення'],
            nextVideo: 'video_2',
            reminders: [1, 3, 5],
            contentUrl: 'https://youtu.be/example1',
            description: 'Тут ти зрозумієш, чому роки спроб не дають зрушення',
        },
        {
            code: 'video_2',
            title: 'ФУНДАМЕНТ',
            messages: ['Тут ти зрозумієш, що внутрішня робота — це стратегія'],
            nextVideo: 'video_3',
            reminders: [1, 3, 5],
            contentUrl: 'https://youtu.be/example2',
            description: 'Тут ти зрозумієш, що внутрішня робота — це стратегія',
        },
        {
            code: 'video_3',
            title: 'ГОЛОВНА ПАСТКА',
            messages: ['Це момент прозріння. Те, що тримає роками, видно саме тут'],
            nextVideo: 'video_4',
            reminders: [1, 3, 5],
            contentUrl: 'https://youtu.be/example3',
            description: 'Це момент прозріння. Те, що тримає роками, видно саме тут',
        },
        {
            code: 'video_4',
            title: 'ДРУГА ПАСТКА',
            messages: ['Вона маскується під логіку, планування, “я ще подумаю”'],
            nextVideo: 'video_5',
            reminders: [1, 3, 5],
            contentUrl: 'https://youtu.be/example4',
            description: 'Вона маскується під логіку, планування, “я ще подумаю”',
        },
        {
            code: 'video_5',
            title: 'ВИБІР / ПРОДУКТ',
            messages: ['Ти побачиш повну картину'],
            nextVideo: null,
            reminders: [1, 3, 5],
            contentUrl: 'https://youtu.be/example5',
            description: 'Ти побачиш повну картину',
        },
        {
            code: 'bonus',
            title: 'БОНУС',
            messages: ['Відчуй, як повертається сила'],
            nextVideo: null,
            reminders: [],
            contentUrl: 'https://youtu.be/bonus',
            description: 'Відчуй, як повертається сила',
        },
    ];
    for (const v of videoSeriesData) {
        const existing = await prisma.video.findUnique({
            where: { code: v.code },
        });
        if (!existing) {
            await prisma.video.upsert({
                where: { code: v.code },
                update: {},
                create: {
                    code: v.code,
                    title: v.title,
                    description: v.description || '',
                    messages: v.messages,
                    nextVideo: v.nextVideo,
                    reminders: v.reminders,
                    contentUrl: v.contentUrl,
                    userId: users['trial@starway.com'].id,
                },
            });
        }
    }
    console.log('✅ Video series seeded');
    // ======================
    // ENROLLMENTS
    // ======================
    const enrollmentsData = [
        {
            userId: users['trial@starway.com'].id,
            productId: products[0].id,
            trialEnd: users['trial@starway.com'].trialEndsAt,
        },
        { userId: users['paid@starway.com'].id, productId: products[1].id, purchased: true },
        { userId: users['nadyastarway@gmail.com'].id, productId: products[3].id, purchased: true },
    ];
    for (const e of enrollmentsData) {
        await prisma.enrollment.upsert({
            where: { userId_productId: { userId: e.userId, productId: e.productId } },
            update: {},
            create: e,
        });
    }
    console.log('✅ Enrollments created');
    // ======================
    // FIVE POINTS MODULE
    // ======================
    const module5 = await prisma.fivePointsModule.upsert({
        where: { code: 'five_points' },
        update: {},
        create: {
            code: 'five_points',
            name: '5 точок опори',
            description: 'Модуль для прокачки стабільності',
            category: 'stability',
            isPremium: true,
            enabled: true,
            order: 1,
        },
    });
    const existingEnrollment = await prisma.fivePointsEnrollment.findUnique({
        where: {
            userId_moduleId: {
                userId: users['trial@starway.com'].id,
                moduleId: module5.id,
            },
        },
    });
    if (!existingEnrollment) {
        // 1️⃣ Створюємо прогрес
        const progress = await prisma.fivePointsProgress.create({
            data: {
                completedLessons: 0,
                totalPoints: 0,
            },
        });
        // 2️⃣ Створюємо enrollment і прив’язуємо progressId
        await prisma.fivePointsEnrollment.create({
            data: {
                userId: users['trial@starway.com'].id,
                moduleId: module5.id,
                progressId: progress.id,
            },
        });
    }
    console.log('✅ Five Points module & progress seeded for trial');
    // ======================
    // AI MENTOR & WHEEL
    // ======================
    const existingMentor = await prisma.mentor.findUnique({
        where: { userId: users['paid@starway.com'].id },
    });
    if (!existingMentor) {
        await prisma.mentor.create({
            data: {
                userId: users['paid@starway.com'].id,
                rules: {},
                summary: {},
                meta: {},
                isActive: true,
            },
        });
    }
    const existingWheel = await prisma.wheelAssessment.findFirst({
        where: { userId: users['paid@starway.com'].id },
    });
    if (!existingWheel) {
        await prisma.wheelAssessment.create({
            data: {
                userId: users['paid@starway.com'].id,
                scores: {},
                weakestSphere: '',
                focusSphere: '',
                analysis: 'Initial wheel assessment',
            },
        });
    }
    console.log('✅ AI Mentor & Wheel seeded for paid');
    // ======================
    // JWT Tokens Output
    // ======================
    console.log('\n🎉 Seed completed! JWT tokens:');
    for (const email in users)
        console.log(`${email} -> ${users[email].accessToken}`);
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
