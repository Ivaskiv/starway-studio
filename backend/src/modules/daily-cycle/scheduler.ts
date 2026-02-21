// backend/src/modules/daily-cycle/daily.scheduler.ts
import { sendEveningQuestion, sendMorningQuestion, sendTelegramMessage } from '@/modules/daily-cycle/telegram.js';
import { MicroTask } from '@prisma/client';
import cron from 'node-cron';
import { prisma } from '../../db/client.js';

let dailySchedulerStarted = false;

export function startDailyScheduler() {
  // fix code_x: ensure scheduler is initialized once and not duplicated on hot-reload.
  if (dailySchedulerStarted) return;
  dailySchedulerStarted = true;

// Вранці 8:00
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('🌅 Morning questions...');
      await sendMorningQuestion();
    },
    { timezone: process.env.TZ || 'Europe/Kyiv' },
  );

// Ввечері 20:00
  cron.schedule(
    '0 20 * * *',
    async () => {
      console.log('🌙 Evening questions...');
      await sendEveningQuestion();
    },
    { timezone: process.env.TZ || 'Europe/Kyiv' },
  );

// 🔔 Нагадування по microTasks
  cron.schedule(
    '*/10 * * * *',
    async () => {
      const overdueTasks = await prisma.microTask.findMany({
        where: { completed: false, dueDate: { lt: new Date() } },
      });

      for (const task of overdueTasks) {
        const title = task.title ?? 'Без назви';
        const user = await prisma.user.findUnique({
          where: { id: task.userId },
          select: { telegramChatId: true },
        });
        if (!user?.telegramChatId) continue;
        await sendTelegramMessage(user.telegramChatId, `⚠️ Завдання "${title}" прострочено!`);
      }
    },
    { timezone: process.env.TZ || 'Europe/Kyiv' },
  );
}

export const scheduleMicroTaskReminder = (task: MicroTask) => {
  if (!task.dueDate || task.completed) return;

  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return; // якщо дата некоректна

  const now = new Date();
  let msUntilDue = due.getTime() - now.getTime();

  if (msUntilDue <= 0) return; // вже прострочено

  // JS setTimeout обмежений ~24.8 дня, тому розбиваємо великі таймаути
  const MAX_TIMEOUT = 2 ** 31 - 1;

  const sendReminder = async () => {
    const updatedTask = await prisma.microTask.findUnique({
      where: { id: task.id },
      select: { userId: true, title: true, completed: true },
    });
    if (updatedTask && !updatedTask.completed) {
      // fix code_x: reminders should be sent to telegramChatId, not internal userId.
      const title = updatedTask.title ?? 'Без назви';
      const user = await prisma.user.findUnique({
        where: { id: updatedTask.userId },
        select: { telegramChatId: true },
      });
      if (!user?.telegramChatId) return;
      await sendTelegramMessage(user.telegramChatId, `⏰ Нагадування: ${title}`);
    }
  };

  if (msUntilDue > MAX_TIMEOUT) {
    // Якщо таймаут більший за максимум, ставимо проміжний
    setTimeout(() => scheduleMicroTaskReminder(task), MAX_TIMEOUT);
  } else {
    setTimeout(sendReminder, msUntilDue);
  }
};
