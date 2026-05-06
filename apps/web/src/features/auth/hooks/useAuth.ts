// frontend/src/features/auth/hooks/useAuth.ts
// FIX: SafeUserDTO → User cast в одному місці через хелпер toUser()
// Після оновлення Ability = string & {} в abilities.ts cast стане no-op
// єдиний хук для auth-дій: 
// логін, реєстрація, соціальний логін, logout. 
// Також відновлює сесію через useGetMeQuery якщо є токен. 
// Повертає user, isAuthenticated, loginWithCredentials тощо.
import type { AppDispatch } from '@/app/store'
import {
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useSocialAuthMutation,
  useTelegramMiniAppAuthMutation,
} from '@/features/auth/services/auth.api'
import {
  clearAuth,
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsLoading,
  setCredentials,
} from '@/features/auth/services/auth.slice'
import { accessApi } from '@/features/auth/services/accessApi'
import { getToken, removeToken } from '@/features/auth/services/token'
import type { SocialAuthApiInput, SocialAuthResult } from '@/features/auth/types/auth.types'
import type { SocialPlatform } from '@/features/social/types/social.types'
import type { RegisterRequest, User } from '@/features/user/types/user.types'
import { DEFAULT_ACCENT, normalizeUiMode } from '@/theme/accent.utils'
import { useThemeContext } from '@/theme/ThemeProvider'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp'

// ── Хелпер: SafeUserDTO → User ───────────────────────────────────────────────
// SafeUserDTO.abilities = string[] (бекенд не знає про тип Ability)
// User.abilities = Ability[] (= string & {} після виправлення abilities.ts)
// → cast безпечний, рантайм не змінюється
const toUser = (dto: any): User => dto as User

const BAD_COLORS = new Set([
  '#ff6b00', '#FF6B00',
  '#ea580c', '#f97316', '#d97706',
  '#0a2446', '#0d1b3e',
])

function safeAccent(color?: string | null): string {
  if (!color) return DEFAULT_ACCENT
  if (BAD_COLORS.has(color)) return DEFAULT_ACCENT
  return color
}

export function useAuth() {
  const dispatch        = useDispatch<AppDispatch>()
  const user            = useSelector(selectCurrentUser)
  const isLoading       = useSelector(selectIsLoading)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const theme           = useThemeContext()

  const [loginMutation]    = useLoginMutation()
  const [registerMutation] = useRegisterMutation()
  const [socialAuth]       = useSocialAuthMutation()
  const [telegramMiniAppAuth] = useTelegramMiniAppAuthMutation()
  const [logoutMutation]   = useLogoutMutation()

  const hasToken = !!getToken()
  const canUseSocialProvider = (provider: SocialPlatform) => {
    if (provider === 'google') return true
    if (provider === 'telegram') return Boolean(getTelegramRuntimeAuthData()) && !isTelegramMiniAppContext()
    return false
  }

  const { data: meData, isError: meError, error: meRawError } = useGetMeQuery(undefined, {
    skip: !hasToken || isAuthenticated || isLoading,
  })

  const finalizeAuth = (nextUser: User, accessToken: string) => {
    dispatch(setCredentials({ user: nextUser, accessToken }))
    theme.setAccent(safeAccent(nextUser.settings?.accentColor))
    if (nextUser.settings?.theme) theme.setMode(normalizeUiMode(nextUser.settings.theme))
    void dispatch(accessApi.endpoints.getMyAccess.initiate(undefined, { forceRefetch: true, subscribe: false }))
    void dispatch(accessApi.endpoints.getMySystemState.initiate(undefined, { forceRefetch: true, subscribe: false }))
  }

  useEffect(() => {
    if (meData?.user) {
      const token = getToken()
      if (token) finalizeAuth(toUser(meData.user), token)
      return
    }
    if (meError) {
      const status = (meRawError as any)?.status
      if (status === 401 || status === 403) {
        dispatch(clearAuth())
        removeToken()
      }
    }
  }, [meData?.user, meError, meRawError, dispatch, theme])

  // ── Actions ──────────────────────────────────────────────────────────────

  const loginWithCredentials = async (data: { email: string; password: string; expertId?: string }) => {
    const expertId = data.expertId ?? resolveExpertId()
    const res = await loginMutation({ ...data, ...(expertId ? { expertId } : {}) }).unwrap()
    finalizeAuth(toUser(res.user), res.accessToken)
    return res
  }

  const registerWithCredentials = async (data: RegisterRequest) => {
    const expertId = resolveExpertId()
    const res = await registerMutation({ ...data, ...(expertId ? { expertId } : {}) }).unwrap()
    finalizeAuth(toUser(res.user), res.accessToken)
    return res
  }

  const loginWithSocial = async (provider: SocialPlatform): Promise<SocialAuthResult> => {
    if (!canUseSocialProvider(provider)) {
      throw new Error(provider === 'telegram' ? 'Telegram social auth unavailable' : 'Social auth unavailable')
    }

    let payload: SocialAuthApiInput

    if (provider === 'telegram') {
      const tg = await getTelegramAuthData()
      payload = { provider: 'telegram', externalId: tg.id, username: tg.username }
    } else if (provider === 'google') {
      const g = await getGoogleAuthData()
      payload = { provider: 'google', externalId: g.id, email: g.email, name: g.name }
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const expertId = resolveExpertId()
    const res = await socialAuth({ ...payload, ...(expertId ? { expertId } : {}) }).unwrap()
    finalizeAuth(toUser(res.user), res.accessToken)

    return {
      provider,
      isNewUser:       res.isNewUser       ?? false,
      needsCompletion: res.needsCompletion ?? false,
      name:  res.user.name  ?? payload.username ?? payload.name,
      email: res.user.email ?? payload.email,
    }
  }

  const logout = async () => {
    try { await logoutMutation().unwrap() }
    finally { dispatch(clearAuth()); removeToken() }
  }

  const loginWithTelegramMiniApp = async (initData: string): Promise<SocialAuthResult> => {
    const res = await telegramMiniAppAuth({ initData }).unwrap()
    finalizeAuth(toUser(res.user), res.accessToken)

    return {
      provider: 'telegram',
      isNewUser: res.isNewUser ?? false,
      needsCompletion: res.needsCompletion ?? false,
      name: res.user.name ?? undefined,
      email: res.user.email ?? undefined,
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithCredentials,
    registerWithCredentials,
    loginWithSocial,
    loginWithTelegramMiniApp,
    canUseSocialProvider,
    logout,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveExpertId(): string | undefined {
  const search     = new URLSearchParams(window.location.search)
  const fromQuery  = search.get('expertId')?.trim()
  const fromStorage = window.localStorage.getItem('expertId')?.trim()
  const fromEnv    = import.meta.env.VITE_EXPERT_ID?.trim()
  const resolved   = fromQuery || fromStorage || fromEnv || undefined
  if (resolved && fromStorage !== resolved) window.localStorage.setItem('expertId', resolved)
  return resolved
}

function getTelegramRuntimeAuthData(): Promise<{ id: string; username?: string }> | { id: string; username?: string } | null {
  const tg = (window as any)?.Telegram?.WebApp
  const user = tg?.initDataUnsafe?.user
  if (!user?.id) return null
  return { id: String(user.id), username: user.username }
}

async function getTelegramAuthData(): Promise<{ id: string; username?: string }> {
  const user = getTelegramRuntimeAuthData()
  if (user) return user
  throw new Error('Telegram social auth unavailable')
}

async function getGoogleAuthData(): Promise<{ id: string; email: string; name: string }> {
  await loadGoogleIdentityScript()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not configured')
  return new Promise((resolve, reject) => {
    const google = (window as any)?.google
    if (!google) return reject(new Error('Google API not loaded'))
    google.accounts.id.initialize({
      client_id: clientId,
      callback:  (r: any) => {
        const d = parseJwt(r.credential)
        resolve({ id: d.sub, email: d.email, name: d.name })
      },
    })
    google.accounts.id.prompt()
  })
}

function parseJwt(token: string) {
  return JSON.parse(atob(token.split('.')[1]))
}

async function loadGoogleIdentityScript() {
  if ((window as any)?.google?.accounts?.id) return
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')
    if (existing) {
      existing.addEventListener('load',  () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true })
      return
    }
    const script         = document.createElement('script')
    script.src           = 'https://accounts.google.com/gsi/client'
    script.async         = true
    script.defer         = true
    script.dataset.googleIdentity = 'true'
    script.onload        = () => resolve()
    script.onerror       = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
}
