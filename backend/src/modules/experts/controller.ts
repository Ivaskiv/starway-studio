import type { Request, Response, NextFunction } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import { createExpert } from './index.js'
import type { ExpertRegistrationPayload } from './types.js'

function isPrismaDuplicateError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

export async function registerExpert(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    email,
    displayName,
    timezone,
    telegramBotToken,
    telegramBotName,
    isActive,
  } = req.body as ExpertRegistrationPayload

  if (!email?.trim() || !displayName?.trim()) {
    return res.status(400).json({ error: 'missing_fields', message: 'Email and display name are required' })
  }

  try {
    const expert = await createExpert({
      email,
      displayName,
      timezone,
      telegramBotToken,
      telegramBotName,
      isActive,
    })

    return res.status(201).json(expert)
  } catch (error: unknown) {
    if (isPrismaDuplicateError(error)) {
      return res.status(409).json({
        error: 'expert_email_exists',
        message: 'An expert with that email already exists',
      })
    }

    next(error)
  }
}
