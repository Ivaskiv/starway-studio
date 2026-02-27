// backend/src/modules/daily-cycle/daily.scheduler.ts
import cron from 'node-cron';
import { prisma } from '@/db/client.js';
import { sendEveningQuestion, sendMorningQuestion } from './telegram.js';
import { MicroTask } from '@/db/generated/prisma/client.js';

let dailySchedulerStarted = false;

// ==========================================
// HELPER: Get Telegram Target
// ==========================================

function getUserTelegramTarget(user: any): string | null {
  return user?.telegramChatId ?? user?.telegramUserId ?? null;
}

// ==========================================
// SEND TELEGRAM MESSAGE (Local implementation)
// ==========================================

async function sendTelegramMessage(chatId: string, message: string) {
  try {
    // Import bot dynamically to avoid circular dependencies
    const { bot } = await import('@/modules/wheel/telegram.js');
    await bot.telegram.sendMessage(chatId, message);
  } catch (error) {
    console.error('❌ Telegram send error:', error);
  }
}

// ==========================================
// START SCHEDULER
// ==========================================

export function startDailyScheduler() {
  if (dailySchedulerStarted) {
    console.log('✅ Daily scheduler already started');
    return;
  }

  dailySchedulerStarted = true;
  console.log('🚀 Starting daily scheduler...');

  const timezone = process.env.TZ || 'Europe/Kyiv';

  // ✅ Morning questions at 8:00 AM
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('🌅 Sending morning questions...');
      try {
        await sendMorningQuestion();
      } catch (error) {
        console.error('❌ Morning questions error:', error);
      }
    },
    { timezone }
  );

  // ✅ Evening questions at 8:00 PM
  cron.schedule(
    '0 20 * * *',
    async () => {
      console.log('🌙 Sending evening questions...');
      try {
        await sendEveningQuestion();
      } catch (error) {
        console.error('❌ Evening questions error:', error);
      }
    },
    { timezone }
  );

  // ✅ Overdue micro-tasks reminders (every 10 minutes)
  cron.schedule(
    '*/10 * * * *',
    async () => {
      try {
        const now = new Date();
        
        const overdueTasks = await prisma.microTask.findMany({
          where: {
            completedAt: null, // ✅ Fix: use completedAt not completedAtAt
            dueDate: { lt: now }
          },
          select: {
            id: true,
            userId: true,
            title: true,
            dueDate: true
          }
        });

        for (const task of overdueTasks) {
          const user = await prisma.user.findUnique({
            where: { id: task.userId },
            select: { 
              telegramChatId: true,
              telegramUserId: true
            }
          });

          const target = getUserTelegramTarget(user);
          if (!target) continue;

          const title = task.title || 'Без назви';
          await sendTelegramMessage(target, `⚠️ Завдання "${title}" прострочено!`);
        }

        if (overdueTasks.length > 0) {
          console.log(`📬 Sent ${overdueTasks.length} overdue task reminders`);
        }
      } catch (error) {
        console.error('❌ Overdue tasks check error:', error);
      }
    },
    { timezone }
  );

  // ✅ Monthly wheel reminder (1st day of month at 9:00 AM)
  cron.schedule(
    '0 9 1 * *',
    async () => {
      console.log('📊 Monthly wheel reminder...');
      try {
        await runWheelMonthlyReminder();
      } catch (error) {
        console.error('❌ Wheel reminder error:', error);
      }
    },
    { timezone }
  );

  // ✅ Monthly wheel report (last day of month at 10:00 PM)
  cron.schedule(
    '0 22 28-31 * *',
    async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      // Check if tomorrow is next month
      if (tomorrow.getMonth() !== now.getMonth()) {
        console.log('📈 Generating monthly wheel report...');
        try {
          await runWheelMonthlyReport();
        } catch (error) {
          console.error('❌ Wheel report error:', error);
        }
      }
    },
    { timezone }
  );

  console.log('✅ Daily scheduler started successfully');
}

// ==========================================
// SCHEDULE MICRO TASK REMINDER
// ==========================================

export function scheduleMicroTaskReminder(task: MicroTask) {
  if (!task.dueDate || task.completedAt) return;

  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return;

  const now = new Date();
  const msUntilDue = due.getTime() - now.getTime();

  if (msUntilDue <= 0) return; // Already overdue

  const MAX_TIMEOUT = 2 ** 31 - 1; // ~24.8 days

  const sendReminder = async () => {
    try {
      const updatedTask = await prisma.microTask.findUnique({
        where: { id: task.id },
        select: {
          userId: true,
          title: true,
          completedAt: true
        }
      });

      if (!updatedTask || updatedTask.completedAt) return;

      const user = await prisma.user.findUnique({
        where: { id: updatedTask.userId },
        select: {
          telegramChatId: true,
          telegramUserId: true
        }
      });

      const target = getUserTelegramTarget(user);
      if (!target) return;

      const title = updatedTask.title || 'Без назви';
      await sendTelegramMessage(target, `⏰ Нагадування: ${title}`);
    } catch (error) {
      console.error('❌ Task reminder error:', error);
    }
  };

  if (msUntilDue > MAX_TIMEOUT) {
    // Schedule intermediate timeout
    setTimeout(() => scheduleMicroTaskReminder(task), MAX_TIMEOUT);
  } else {
    setTimeout(sendReminder, msUntilDue);
  }
}

// ==========================================
// WHEEL JOBS (Simple implementations)
// ==========================================

async function runWheelMonthlyReminder() {
  const users = await prisma.user.findMany({
    where: {
      telegramUserId: { not: null }
    },
    select: {
      telegramUserId: true,
      telegramChatId: true
    }
  });

  for (const user of users) {
    const target = getUserTelegramTarget(user);
    if (!target) continue;

    await sendTelegramMessage(
      target,
      '📊 Час оновити своє колесо балансу! Використай /wheel'
    );
  }

  console.log(`📬 Sent wheel reminders to ${users.length} users`);
}

async function runWheelMonthlyReport() {
  const users = await prisma.user.findMany({
    where: {
      telegramUserId: { not: null }
    },
    select: {
      id: true,
      telegramUserId: true,
      telegramChatId: true
    }
  });

  for (const user of users) {
    try {
      // Get user's wheel history
      const entries = await prisma.userBalanceEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      if (entries.length === 0) continue;

      const target = getUserTelegramTarget(user);
      if (!target) continue;

      await sendTelegramMessage(
        target,
        '📈 Місячний звіт готовий! Переглянь свій прогрес у додатку.'
      );
    } catch (error) {
      console.error(`❌ Report error for user ${user.id}:`, error);
    }
  }

  console.log(`📬 Sent monthly reports to ${users.length} users`);
}