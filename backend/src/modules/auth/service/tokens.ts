import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'

import { prisma } from '../../../db/client.js'
import type { AuthUser } from '../../../types/globalTypes.js'
import { AuthServiceError } from '../errors.js'
import { toAuthServiceError } from './shared.js'

const ACCESS_SECRET = getEnv('JWT_ACCESS_SECRET')
const REFRESH_SECRET = getEnv('JWT_REFRESH_SECRET')

const ACCESS_EXPIRES = (
  process.env.JWT_EXPIRES_IN?.trim() || '15m'
) as SignOptions['expiresIn']

const REFRESH_EXPIRES = (
  process.env.JWT_REFRESH_EXPIRES_IN?.trim() || '30d'
) as SignOptions['expiresIn']

function getEnv(
  name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

export const hashPassword = (password: string) =>
  bcrypt.hash(password, 12)

export const comparePassword = (
  password: string,
  hash: string,
) => bcrypt.compare(password, hash)

export function generateAccessToken(payload: AuthUser) {
  return jwt.sign(
    payload,
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES },
  )
}

export function generateRefreshToken(userId: string) {
  return jwt.sign(
    {
      id: userId,
      jti: crypto.randomUUID(),
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES },
  )
}

export function verifyAccessToken(token: string): AuthUser {
  return jwt.verify(
    token,
    ACCESS_SECRET,
  ) as AuthUser
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(
    token,
    REFRESH_SECRET,
  ) as { id: string }
}

const fallbackRefreshTokens = new Map<
  string,
  {
    userId: string
    expiresAt: Date
  }
>()

const MAX_FALLBACK_REFRESH_TOKENS = 500

let refreshTableAvailable: boolean | undefined

function pruneFallbackRefreshTokens(): void {
  const now = Date.now()

  for (const [key, value] of fallbackRefreshTokens.entries()) {
    if (value.expiresAt.getTime() <= now) {
      fallbackRefreshTokens.delete(key)
    }
  }

  while (
    fallbackRefreshTokens.size >
    MAX_FALLBACK_REFRESH_TOKENS
  ) {
    const oldestKey =
      fallbackRefreshTokens.keys().next().value

    if (!oldestKey) return

    fallbackRefreshTokens.delete(oldestKey)
  }
}

async function checkRefreshTableAvailability(): Promise<boolean> {
  if (typeof refreshTableAvailable !== 'undefined') {
    return refreshTableAvailable
  }

  try {
    await prisma.$queryRaw`
      SELECT 1 FROM "RefreshToken" LIMIT 1
    `

    refreshTableAvailable = true
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'P2021'
    ) {
      console.warn(
        '[AuthService] RefreshToken table missing - falling back to in-memory store',
      )

      refreshTableAvailable = false
    } else {
      throw error
    }
  }

  return refreshTableAvailable
}

export async function storeRefreshToken(
  userId: string,
  token: string,
) {
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  )

  if (!(await checkRefreshTableAvailability())) {
    pruneFallbackRefreshTokens()

    fallbackRefreshTokens.set(
      token,
      {
        userId,
        expiresAt,
      },
    )

    return {
      token,
      userId,
      expiresAt,
    }
  }

  let savedToken = null
  let tries = 0

  while (!savedToken && tries < 5) {
    try {
      savedToken = await prisma.refreshToken.create({
        data: {
          token,
          userId,
          expiresAt,
        },
      })
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        token = generateRefreshToken(userId)
        tries += 1
      } else {
        throw error
      }
    }
  }

  if (!savedToken) {
    throw new Error(
      'Не вдалося зберегти refresh token після 5 спроб',
    )
  }

  return savedToken
}

export async function removeRefreshToken(token: string) {
  try {
    if (await checkRefreshTableAvailability()) {
      return await prisma.refreshToken.deleteMany({
        where: { token },
      })
    }

    fallbackRefreshTokens.delete(token)

    return { count: 0 }
  } catch (error) {
    throw toAuthServiceError(
      error,
      'refresh_token_remove_failed',
    )
  }
}

export async function findRefreshToken(token: string) {
  try {
    if (await checkRefreshTableAvailability()) {
      return await prisma.refreshToken.findUnique({
        where: { token },
      })
    }

    pruneFallbackRefreshTokens()

    const data = fallbackRefreshTokens.get(token)

    if (!data) {
      return null
    }

    return {
      token,
      userId: data.userId,
      expiresAt: data.expiresAt,
    }
  } catch (error) {
    throw toAuthServiceError(
      error,
      'refresh_token_find_failed',
    )
  }
}
