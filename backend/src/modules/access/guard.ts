import type { NextFunction, Response } from 'express'

import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { logger } from '../../utils/logger.js'
import { getAccessControlState } from './index.js'
import type { AccessBlockReason } from './types.js'

type LeadAccessOptions = {
  allowStart?: boolean
}

type ClientAccessOptions = {
  requiresTelegram?: boolean
}

async function enforceClientAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  options: ClientAccessOptions = {},
) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  req.accessControl = req.accessControl ?? await getAccessControlState(req.user.id)
  const access = req.accessControl

  if (access.currentFlow === 'lead-magnet') {
    return sendForbidden(
      req,
      res,
      'LEAD_FLOW_LOCK',
      'Спочатку завершуємо поточний практикум, а потім відкриваємо наступний крок',
    )
  }

  if (!access.hasSubscription) {
    return sendForbidden(
      req,
      res,
      'SUBSCRIPTION_REQUIRED',
      'Щоб відкрити цю частину, потрібно відновити доступ',
    )
  }

  if (options.requiresTelegram && !access.hasTelegramLinked) {
    return sendForbidden(
      req,
      res,
      'TELEGRAM_REQUIRED',
      'Потрібно підключити Telegram, щоб продовжити',
    )
  }

  if (!access.hasTelegramLinked) {
    logger.info(`[AccessGuard] allow_without_telegram ${req.method} ${req.originalUrl} user=${req.user.id}`)
  }

  logDecision(req, 'allow')
  return next()
}

function logDecision(req: AuthenticatedRequest, decision: 'allow' | 'block', reason?: AccessBlockReason) {
  const access = req.accessControl
  logger.info(
    `[AccessGuard] ${decision.toUpperCase()} ${req.method} ${req.originalUrl} ` +
      `flow=${access?.currentFlow ?? 'unknown'} level=${access?.accessLevel ?? 'unknown'} reason=${reason ?? 'none'}`,
  )
}

function sendForbidden(
  req: AuthenticatedRequest,
  res: Response,
  reason: AccessBlockReason,
  message: string,
) {
  logDecision(req, 'block', reason)
  return res.status(403).json({
    error: 'forbidden',
    reason,
    message,
    currentFlow: req.accessControl?.currentFlow ?? null,
    accessLevel: req.accessControl?.accessLevel ?? 'GUEST',
  })
}

export async function attachAccessControl(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user?.id) {
    return next()
  }

  try {
    req.accessControl = await getAccessControlState(req.user.id)
    logger.info(
      `[AccessGuard] snapshot user=${req.user.id} flow=${req.accessControl.currentFlow ?? 'none'} ` +
        `level=${req.accessControl.accessLevel} step=${req.accessControl.currentStep}`,
    )
  } catch (error) {
    logger.warn(`[AccessGuard] failed to resolve snapshot for ${req.user.id}: ${(error as Error).message}`)
  }

  return next()
}

export function requireLeadAccess(options: LeadAccessOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    req.accessControl = req.accessControl ?? await getAccessControlState(req.user.id)
    const access = req.accessControl
    const canStartLead = options.allowStart && !access.hasLeadMagnet && !access.hasSubscription

    if (access.currentFlow === 'lead-magnet' || canStartLead) {
      logDecision(req, 'allow')
      return next()
    }

    return sendForbidden(
      req,
      res,
      'LEAD_ACCESS_REQUIRED',
      'Поверніться до практикуму, щоб продовжити цей маршрут',
    )
  }
}

type RequireClientAccess = {
  (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<unknown>
  (options?: ClientAccessOptions): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>
}

type ClientAccessMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => Promise<unknown>

export const requireClientAccess: RequireClientAccess = ((
  reqOrOptions: AuthenticatedRequest | ClientAccessOptions,
  res?: Response,
  next?: NextFunction,
): Promise<unknown> | ClientAccessMiddleware => {
  if (res && next) {
    return enforceClientAccess(reqOrOptions as AuthenticatedRequest, res, next)
  }

  const options = reqOrOptions as ClientAccessOptions | undefined
  return async (req: AuthenticatedRequest, response: Response, nextFn: NextFunction) =>
    enforceClientAccess(req, response, nextFn, options)
}) as RequireClientAccess
