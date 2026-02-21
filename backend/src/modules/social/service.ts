// backend/src/modules/social/social.service.ts
import { prisma } from '@/db/client.js';
import crypto from 'crypto';
import type { SocialConnection, SocialProvider } from './types.js';

export async function getSocialConnections(userId: string): Promise<SocialConnection[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramUserName: true,
      telegramChatId: true,
    },
  });

  if (!user) return [];

  const connections: SocialConnection[] = [];

  if (user.telegramUserName || user.telegramChatId) {
    connections.push({
      provider: 'telegram',
      externalId: user.telegramChatId || '',
      username: user.telegramUserName,
      connectedAt: new Date(),
    });
  }

  return connections;
}

export async function connectSocial(userId: string, data: SocialConnection): Promise<void> {
  if (data.provider !== 'telegram') return;

  const username = data.username?.replace('@', '').trim() || null;
  const rawExternalId = (data.externalId || '').trim();
  const chatId = /^-?\d+$/.test(rawExternalId) ? rawExternalId : null;

  // fix code_x: support initial Telegram setup via username only (chatId will be linked on bot /start).
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramUserName: username,
      ...(chatId ? { telegramChatId: chatId } : {}),
    },
  });
}

export async function disconnectSocial(userId: string, provider: SocialProvider): Promise<void> {
  if (provider === 'telegram') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserName: null,
        telegramChatId: null,
      },
    });
  }
}

export async function generateTelegramLink(userId: string, botUsername: string) {
  const code = crypto.randomBytes(16).toString('hex');
  const expiresIn = 15 * 60; // 15 min
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.telegramLink.deleteMany({ where: { userId } });
  await prisma.telegramLink.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  const link = `https://t.me/${botUsername}?start=link_${code}`;
  return { link, expiresIn };
}

export async function verifyTelegramLinkCode(code: string): Promise<string | null> {
  const normalized = String(code || '').replace(/^link_/, '');

  const link = await prisma.telegramLink.findUnique({
    where: { code: normalized },
    select: { userId: true, expiresAt: true },
  });

  if (!link) return null;
  if (link.expiresAt.getTime() < Date.now()) {
    await prisma.telegramLink.delete({ where: { code: normalized } }).catch(() => undefined);
    return null;
  }

  await prisma.telegramLink.delete({ where: { code: normalized } }).catch(() => undefined);
  return link.userId;
}
