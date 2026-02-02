// backend/src/modules/social/social.service.ts
import { SocialConnection, SocialProvider, TelegramLinkData } from '@/modules/social/social.types.js';
import { sql } from '../../db/client.js';

// ================= GET CONNECTIONS =================
export async function getSocialConnections(userId: string): Promise<SocialConnection[]> {
  // 🔹 Повертаємо всі підключення користувача
  const connections = await sql<SocialConnection>
  `
    SELECT
      provider,
      external_id AS "externalId",
      username,
      access_token AS "accessToken",
      refresh_token AS "refreshToken",
      metadata,
      connected_at AS "connectedAt"
    FROM user_social_connections
    WHERE user_id = ${userId}
    ORDER BY connected_at DESC
  `;
  return connections;
}

// ================= CONNECT SOCIAL =================
export async function connectSocial(userId: string, data: SocialConnection): Promise<void> {
  const { provider, externalId, username, accessToken, refreshToken, metadata } = data;

  // 🔹 Перевірка, чи акаунт вже підключений до іншого користувача
  const existingConnections = await sql<{ user_id: string }>
  `
    SELECT user_id
    FROM user_social_connections
    WHERE provider = ${provider} AND external_id = ${externalId}
  `;

  if (existingConnections.length > 0) {
    const existingUserId = existingConnections[0].user_id;
    if (existingUserId !== userId) {
      throw new Error('already_connected'); // вже підключено до іншого
    }
  }

  // 🔹 Upsert підключення
  await sql
  `
    INSERT INTO user_social_connections (
      user_id,
      provider,
      external_id,
      username,
      access_token,
      refresh_token,
      metadata,
      connected_at
    ) VALUES (
      ${userId},
      ${provider},
      ${externalId},
      ${username || null},
      ${accessToken || null},
      ${refreshToken || null},
      ${metadata ? JSON.stringify(metadata) : '{}'},
      NOW()
    )
    ON CONFLICT (user_id, provider)
    DO UPDATE SET
      external_id = ${externalId},
      username = ${username || null},
      access_token = ${accessToken || null},
      refresh_token = ${refreshToken || null},
      metadata = ${metadata ? JSON.stringify(metadata) : '{}'},
      connected_at = NOW()
  `;

  // 🔹 Backward compatibility для Telegram
  if (provider === 'telegram') {
    await sql
    `
      UPDATE users
      SET telegram_id = ${externalId},
          telegram_username = ${username || null},
          telegram_connected_at = NOW()
      WHERE id = ${userId}
    `;
  }
}

// ================= DISCONNECT SOCIAL =================
export async function disconnectSocial(userId: string, provider: SocialProvider): Promise<void> {
  await sql `
    DELETE FROM user_social_connections
    WHERE user_id = ${userId} AND provider = ${provider}
  `;

  if (provider === 'telegram') {
    await sql `
      UPDATE users
      SET telegram_id = NULL,
          telegram_username = NULL,
          telegram_connected_at = NULL
      WHERE id = ${userId}
    `;
  }
}

// ================= TELEGRAM LINK =================
export async function generateTelegramLink(userId: string, botUsername: string): Promise<TelegramLinkData> {
  const linkCode = Buffer.from(`${userId}:${Date.now()}`).toString('base64url');

  await sql `
    INSERT INTO telegram_link_codes (user_id, code, expires_at)
    VALUES (${userId}, ${linkCode}, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (user_id)
    DO UPDATE SET
      code = ${linkCode},
      expires_at = NOW() + INTERVAL '10 minutes'
  `;

  return { link: `https://t.me/${botUsername}?start=${linkCode}`, expiresIn: 600 };
}

export async function verifyTelegramLinkCode(code: string): Promise<string | null> {
  const [result] = await sql<{ user_id: string }>
  `
    SELECT user_id
    FROM telegram_link_codes
    WHERE code = ${code} AND expires_at > NOW()
  `;

  if (!result) return null;

  await sql
  `
    DELETE FROM telegram_link_codes
    WHERE code = ${code}
  `;

  return result.user_id;
}

// ================= FIND SOCIAL CONNECTION =================
export async function findSocialConnection(provider: SocialProvider, externalId: string): Promise<{ userId: string } | null> {
  const [connection] = await sql<{ user_id: string }> 
  `
    SELECT user_id
    FROM user_social_connections
    WHERE provider = ${provider} AND external_id = ${externalId}
    LIMIT 1
  `;

  if (!connection) return null;

  return { userId: connection.user_id };
}
