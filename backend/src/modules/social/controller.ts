// backend/src/modules/social/social.controller.ts
import type { Request, Response } from 'express';
import type { ConnectSocialInput, SocialResponse } from './types.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { serverError } from '../../utils/serverError.js';
import { socialService } from '../../modules/social/service.js';
import { requireTelegramBotConfig } from '../telegram-mentor/runtime/botConfig.js';

// ================= GET CONNECTIONS =================
export async function getConnections(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'unauthorized',
      });
    }

    const connections = await socialService.getSocialConnections(userId);

    const response: SocialResponse = {
      success: true,
      connections,
    };

    res.json(response);
  } catch (err) {
    return serverError(res, 'GET /social/connections', err);
  }
}

// ================= CONNECT SOCIAL =================
export async function connect(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'unauthorized',
      });
    }

    const data: ConnectSocialInput = req.body;

    // Валідація
    if (!data.provider) {
      return res.status(400).json({
        success: false,
        message: 'provider_required',
      });
    }

    if (data.provider === 'telegram') {
      const hasUsername = Boolean(data.username && data.username.trim());
      const hasExternalId = Boolean(data.externalId && data.externalId.trim());
      if (!hasUsername && !hasExternalId) {
        return res.status(400).json({
          success: false,
          message: 'telegram_username_or_chatid_required',
        });
      }
    } else if (!data.externalId) {
      return res.status(400).json({
        success: false,
        message: 'provider_and_external_id_required',
      });
    }

    await socialService.connectSocial(userId, data as any);

    res.json({
      success: true,
      message: `${data.provider}_connected`,
    });
  } catch (err: any) {
    // Спеціальна обробка конфліктів
    if (err.message === 'already_connected') {
      return res.status(409).json({
        success: false,
        message: 'social_account_already_connected_to_another_user',
      });
    }

    return serverError(res, 'POST /social/connect', err);
  }
}

// ================= DISCONNECT SOCIAL =================
export async function disconnect(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'unauthorized',
      });
    }

    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'provider_required',
      });
    }

    await socialService.disconnectSocial(userId, provider);

    res.json({
      success: true,
      message: `${provider}_disconnected`,
    });
  } catch (err) {
    return serverError(res, 'POST /social/disconnect', err);
  }
}

// ================= TELEGRAM LINK =================
export async function telegramLink(req:AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'unauthorized',
      });
    }

      const botUsername = requireTelegramBotConfig('social telegram connect').username;
    const { link, expiresIn } = await socialService.generateTelegramLink(userId, botUsername);
    const state = await resolveUserState(userId).catch(() => null)

    await trackEvent({
      userId,
      type: 'web_telegram_link_opened',
      source: 'web',
      state,
      payload: {
        botUsername,
        expiresIn,
      },
    })

    res.json({
      success: true,
      link,
      expiresIn,
    });
  } catch (err) {
    return serverError(res, 'GET /social/telegram/link', err);
  }
}

// ================= VERIFY TELEGRAM CODE (для бота) =================
export async function verifyTelegramCode(req: Request, res: Response) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'code_required',
      });
    }

    const userId = await socialService.verifyTelegramLinkCode(code);

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: 'invalid_or_expired_code',
      });
    }

    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_telegram_link_verified',
      source: 'web',
      state,
      payload: {
        code,
      },
    })

    res.json({
      success: true,
      userId,
    });
  } catch (err) {
    return serverError(res, 'POST /social/telegram/verify', err);
  }
}
