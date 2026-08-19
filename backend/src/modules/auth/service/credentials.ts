import { prisma } from '../../../db/client.js'
import { assignUserToExpert } from '../../experts/ownership.service.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { computeAvailableRoles,resolveActiveRole } from '../access/roles.js'
import { isSuperAdminEmail } from '../access/superadmin.js'
import { AuthServiceError } from '../errors.js'
import {
hasProfileName,
linkTelegramIdentityToUser,
normalizeEmail,
normalizePhone,
resolveRequestedExpertId,
toAuthServiceError,
validateExpertId,
type AuthTokensPayload,
} from './shared.js'
import {
comparePassword,
generateAccessToken,
generateRefreshToken,
hashPassword,
storeRefreshToken,
} from './tokens.js'
import {
findRawUserByEmail,
findRawUserById,
findUserById,
resolveSafeUserById,
toSafeUser,
} from './users.js'

export async function promoteUserToAdminIfNeeded(userId: string): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (!existing || existing.role === 'SUPERADMIN' || existing.role === 'ADMIN') return
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    })
  } catch (error) {
    throw toAuthServiceError(error, 'promote_user_failed')
  }
}

// ── Оновлення lastLoginAt ─────────────────
export async function markUserLoggedIn(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      // важливо: не повертати всі поля (інакше при schema mismatch падає P2022)
      select: { id: true },
    })
  } catch (error) {
    throw toAuthServiceError(error, 'mark_user_logged_in_failed')
  }
}

export async function createSessionForUserId(userId: string): Promise<AuthTokensPayload> {
  try {
    await markUserLoggedIn(userId)

    const baseUser = await findRawUserById(userId)
    if (!baseUser) {
      throw new AuthServiceError('user_not_found', 404)
    }
    if (!baseUser.email) {
      throw new AuthServiceError('user_email_missing', 500, 'User email missing')
    }

    const safeUser = await resolveSafeUserById(userId)
    if (!safeUser) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const availableRoles = computeAvailableRoles({ role: baseUser.role })
    const activeRole = resolveActiveRole((baseUser as any).activeRole ?? baseUser.role, availableRoles)
    const accessToken = generateAccessToken({ id: baseUser.id, role: baseUser.role, activeRole, email: baseUser.email })
    const refreshToken = generateRefreshToken(baseUser.id)
    await storeRefreshToken(baseUser.id, refreshToken)

    return {
      user: safeUser,
      accessToken,
      refreshToken,
      needsProfile: !hasProfileName(baseUser),
      expiresIn: 15 * 60,
    }
  } catch (error) {
    console.error('[AuthService] createSessionForUserId failed', {
      userId,
      error: error instanceof Error ? error.stack : error,
    })
    throw toAuthServiceError(error, 'create_session_failed')
  }
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string | null
  expertId?: string | null
  phone?: string | null
  telegramId?: string | null
  requestId?: string | null
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')
  const phone = normalizePhone(input.phone)

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'
    const validatedExpertId = initialRole === 'USER'
      ? await resolveRequestedExpertId(input.expertId)
      : await validateExpertId(input.expertId)
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, phone: true },
    })

    const passwordHash = await hashPassword(password)

    let userId: string

    if (existing) {
      if (existing.passwordHash) {
        throw new AuthServiceError('email_already_registered', 400)
      }
      if (phone && existing.phone && existing.phone !== phone) {
        throw new AuthServiceError('phone_already_registered', 400)
      }

      if (phone && !existing.phone) {
        const phoneOwner = await prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        })
        if (phoneOwner && phoneOwner.id !== existing.id) {
          throw new AuthServiceError('phone_already_registered', 400)
        }
      }

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          phone: phone ?? existing.phone ?? null,
        },
        select: { id: true },
      })

      userId = updated.id
    } else {
      const resolved = await resolveOrCreateUser(
        {
          email,
          phone: phone ?? undefined,
          telegramId: input.telegramId ?? undefined,
        },
        {
          source: UserCreationSource.SYSTEM,
          requestId: input.requestId ?? null,
          name: input.name ?? null,
          role: initialRole,
          expertId: validatedExpertId,
          passwordHash,
          createData: {
            phone: phone ?? null,
          },
        },
      )

      if (resolved.conflict) {
        throw new AuthServiceError(phone ? 'phone_already_registered' : 'email_already_registered', 400)
      }

      userId = resolved.user.id
    }

    await linkTelegramIdentityToUser(userId, input.telegramId ?? null)

    const user = await findUserById(userId)
    if (!user) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    const userAvailableRoles = computeAvailableRoles({ role: user.role })
    const userActiveRole = resolveActiveRole((user as any).activeRole ?? user.role, userAvailableRoles)
    const accessToken = generateAccessToken({ id: user.id, role: user.role, activeRole: userActiveRole, email: user.email })
    const refreshToken = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, refreshToken)
    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      needsProfile: !hasProfileName(user),
      expiresIn: 15 * 60,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'register_failed')
  }
}

export async function loginUser(input: {
  email: string
  password: string
  expertId?: string | null
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const user = await findRawUserByEmail(email)

    if (!user) {
      throw new AuthServiceError('user_not_registered', 404, 'Користувач ще не зареєстрований')
    }

    if (!user.passwordHash) {
      throw new AuthServiceError('invalid_credentials', 401)
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      throw new AuthServiceError('invalid_credentials', 401)
    }

    try {
      const resolvedExpertId =
        user.role === 'USER'
          ? await resolveRequestedExpertId(input.expertId)
          : await validateExpertId(input.expertId)

      if (resolvedExpertId) {
        await assignUserToExpert(user.id, resolvedExpertId)
      }
    } catch (error) {
      console.warn('[AuthService] login expert assignment skipped', {
        userId: user.id,
        error,
      })
    }

    return createSessionForUserId(user.id)
  } catch (error) {
    console.error('[AuthService] loginUser failed', {
      email,
      error: error instanceof Error ? error.stack : error,
    })
    throw toAuthServiceError(error, 'login_failed')
  }
}
