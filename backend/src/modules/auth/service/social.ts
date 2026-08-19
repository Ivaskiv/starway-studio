import type { UserWithSub } from '../../../types/globalTypes.js'
import { assignUserToExpert } from '../../experts/ownership.service.js'
import { findLinkedUserId } from '../../telegram-mentor/services/identity/linking.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { isSuperAdminEmail } from '../access/superadmin.js'
import { AuthServiceError } from '../errors.js'
import { verifyTelegramInitData } from '../telegram.js'
import {
createSessionForUserId,
} from './credentials.js'
import {
createUserCompat,
hasProfileName,
normalizeEmail,
resolveRequestedExpertId,
resolveTelegramSocialUser,
toAuthServiceError,
validateExpertId,
type AuthTokensPayload,
type SocialAuthInput,
} from './shared.js'
import {
findUserByEmail,
findUserById,
} from './users.js'

export async function socialLoginUser(input: SocialAuthInput): Promise<AuthTokensPayload> {
  const provider = input.provider
  const externalId = String(input.externalId ?? '').trim()

  if (!provider || !externalId) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    let userId: string | null = null
    let isNewUser = false

    if (provider === 'google') {
      const email = normalizeEmail(input.email ?? '')
      if (!email) {
        throw new AuthServiceError('missing_fields', 400)
      }

      const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'
      const validatedExpertId = initialRole === 'USER'
        ? await resolveRequestedExpertId(input.expertId)
        : await validateExpertId(input.expertId)

      const existing = await findUserByEmail(email)
      if (existing?.id) {
        userId = existing.id
        if (validatedExpertId && existing.role === 'USER') {
          await assignUserToExpert(existing.id, validatedExpertId)
        }
      } else {
        const created = await createUserCompat({
          email,
          firstName: input.name?.trim() || null,
          role: initialRole,
          lastLoginAt: new Date(),
          expertId: validatedExpertId,
          source: UserCreationSource.GOOGLE_LOGIN,
          requestId: input.requestId ?? null,
        })
        userId = created.id
        isNewUser = true
      }
    } else {
      const resolved = await resolveTelegramSocialUser(input)
      userId = resolved.id
      isNewUser = resolved.created

      if (resolved.expertId) {
        await assignUserToExpert(userId, resolved.expertId)
      }
    }

    if (!userId) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    const session = await createSessionForUserId(userId)

    return {
      ...session,
      needsCompletion: !session.user.email || !hasProfileName(session.user),
      isNewUser,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'social_login_failed')
  }
}

export async function telegramMiniAppLoginUser(
  initData: string,
  requestId?: string | null,
): Promise<AuthTokensPayload> {
  const normalizedInitData = String(initData ?? '').trim()

  if (!normalizedInitData) {
    throw new AuthServiceError('missing_fields', 400)
  }

  const telegramUser = verifyTelegramInitData(normalizedInitData)

  const linkedUserId = await findLinkedUserId({
    chatId: telegramUser.id,
    telegramUserId: telegramUser.id,
    telegramUserName: telegramUser.username ?? null,
  })

  if (linkedUserId) {
    const session = await createSessionForUserId(linkedUserId)

    return {
      ...session,
      needsCompletion: !session.user.email || !hasProfileName(session.user),
      isNewUser: false,
    }
  }

  return socialLoginUser({
    provider: 'telegram',
    externalId: telegramUser.id,
    username: telegramUser.username ?? undefined,
    name: telegramUser.firstName ?? undefined,
    requestId: requestId ?? null,
  })
}

export async function getCurrentUser(params: {
  userId?: string
  email?: string | null
}): Promise<UserWithSub> {
  try {
    const userId = params.userId?.trim()
    const email = params.email ? normalizeEmail(params.email) : null

    if (!userId && !email) {
      throw new AuthServiceError('unauthorized', 401)
    }

    const user = userId
      ? await findUserById(userId)
      : await findUserByEmail(email!)

    if (!user) {
      throw new AuthServiceError('user_not_found', 404, 'Користувач ще не зареєстрований')
    }

    return user
  } catch (error) {
    throw toAuthServiceError(error, 'get_current_user_failed')
  }
}
