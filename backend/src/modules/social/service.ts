import { prisma } from '../../db/client.js';
import crypto from 'crypto';
import { createTelegramBindingDeepLink } from '../deeplinks/service.js';
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
      username: user.telegramUserName || null,
      connectedAt: new Date(),
    });
  }

  return connections;
}

export async function connectSocial(userId: string, data: SocialConnection): Promise<void> {
  if (data.provider !== 'telegram') return;

  const username = data.username?.replace('../..', '').trim() || null;
  const rawExternalId = (data.externalId || '').trim();
  const chatId = /^-?\d+$/.test(rawExternalId) ? rawExternalId : null;

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
  try {
    const { link, expiresIn } = await createTelegramBindingDeepLink(userId);
    void botUsername
    return { link, expiresIn };
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'DEEPLINK_TABLE_MISSING') {
      throw error
    }

    const code = crypto.randomBytes(16).toString('hex');
    const expiresIn = 15 * 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.telegramLink.deleteMany({ where: { userId } });

    const linkRecord = await prisma.telegramLink.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });

    return {
      link: `https://t.me/${botUsername}?start=starway_${linkRecord.code}`,
      expiresIn,
    };
  }
}

export async function verifyTelegramLinkCode(code: string): Promise<string | null> {
  const normalized = String(code || '').replace(/^starway_/, '').replace(/^link_/, '');

  // findFirst, бо code не є унікальним полем
  const link = await prisma.telegramLink.findFirst({
    where: { code: normalized },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!link) return null;

  const now = Date.now();
  if (link.expiresAt.getTime() < now) {
    // видаляємо по id
    await prisma.telegramLink.delete({ where: { id: link.id } }).catch(() => undefined);
    return null;
  }

  await prisma.telegramLink.delete({ where: { id: link.id } }).catch(() => undefined);
  return link.userId;
}

export const socialService = {
  getSocialConnections,
  connectSocial,
  disconnectSocial,
  generateTelegramLink,
  verifyTelegramLinkCode,
};
