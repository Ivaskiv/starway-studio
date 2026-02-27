// frontend/src/features/auth/hooks/useAuth.ts
import {
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useSocialAuthMutation,
} from '@/features/auth/services/auth.api';
import {
  clearAuth,
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsLoading,
  setCredentials,
} from '@/features/auth/services/auth.slice';
import { getToken, removeToken } from '@/features/auth/services/token';
import type { SocialAuthApiInput, SocialAuthResult } from '@/features/auth/types/auth.types';
import type { SocialPlatform } from '@/features/social/types/social.types';
import type { RegisterRequest } from '@/features/user/types/user.types';
import { applyAccentColor, saveAccentColor } from '@/shared/utils/accent.utils';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isLoading = useSelector(selectIsLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [socialAuth] = useSocialAuthMutation();
  const [logoutMutation] = useLogoutMutation();

  const hasToken = !!getToken();

  // ── Відновлення сесії через /me ──────────────────────────────────────────
  const {
    data: meData,
    isError: meError,
    error: meRawError,
  } = useGetMeQuery(undefined, {
    skip: !hasToken || isAuthenticated,
  });

  useEffect(() => {

    if (meData?.user) {
      const token = getToken();
      if (token) dispatch(setCredentials({ user: meData.user, accessToken: token }));
      if (meData.user.settings?.accentColor) {
        // fix_code_x: keep UI accent synchronized with persisted user settings after session restore.
        saveAccentColor(meData.user.settings.accentColor);
        applyAccentColor(meData.user.settings.accentColor);
      }
      return;
    }
    if (meError) {
      const status = (meRawError as any)?.status;
      // 401 → api.ts вже обробив refresh. Очищаємо тільки при інших помилках.
      if (status !== 401) {
        dispatch(clearAuth());
        removeToken();
      }
    }
  }, [meData?.user, meError, meRawError, dispatch]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const loginWithCredentials = async (data: { email: string; password: string; expertId?: string }) => {
    const expertId = data.expertId ?? resolveExpertId();
    const res = await loginMutation({
      ...data,
      ...(expertId ? { expertId } : {}),
    }).unwrap();
    dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
    if (res.user.settings?.accentColor) applyAccentColor(res.user.settings.accentColor);
    return res;
  };

  // ✅ RegisterRequest = { name?: string; email: string; password: string; role?: UserRole }
  const registerWithCredentials = async (data: RegisterRequest) => {
    const expertId = resolveExpertId();
    const res = await registerMutation({
      ...data,
      ...(expertId ? { expertId } : {}),
    }).unwrap();
    dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
    if (res.user.settings?.accentColor) applyAccentColor(res.user.settings.accentColor);
    return res;
  };

  const loginWithSocial = async (provider: SocialPlatform): Promise<SocialAuthResult> => {
    let payload: SocialAuthApiInput;

    if (provider === 'telegram') {
      const tg = await getTelegramAuthData();
      payload = { provider: 'telegram', externalId: tg.id, username: tg.username };
    } else if (provider === 'google') {
      const g = await getGoogleAuthData();
      payload = { provider: 'google', externalId: g.id, email: g.email, name: g.name };
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const expertId = resolveExpertId();
    const res = await socialAuth({
      ...payload,
      ...(expertId ? { expertId } : {}),
    }).unwrap();
    dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
    if (res.user.settings?.accentColor) applyAccentColor(res.user.settings.accentColor);

    return {
      provider,
      isNewUser: res.isNewUser ?? false,
      needsCompletion: res.needsCompletion ?? false,
      name: res.user.name ?? payload.username ?? payload.name,
      email: res.user.email ?? payload.email,
    };
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } finally {
      dispatch(clearAuth());
      removeToken();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithCredentials,
    registerWithCredentials,
    loginWithSocial,
    logout,
  };
}

function resolveExpertId(): string | undefined {
  const search = new URLSearchParams(window.location.search);
  const fromQuery = search.get('expertId')?.trim();
  const fromStorage = window.localStorage.getItem('expertId')?.trim();
  const fromEnv = import.meta.env.VITE_EXPERT_ID?.trim();
  const resolved = fromQuery || fromStorage || fromEnv || undefined;

  if (resolved && fromStorage !== resolved) {
    window.localStorage.setItem('expertId', resolved);
  }

  return resolved;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getTelegramAuthData(): Promise<{ id: string; username?: string }> {
  const tg = (window as any)?.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  if (user) {
    return { id: String(user.id), username: user.username };
  }

  // fix code_x: web fallback for Telegram auth when app is opened outside miniapp.
  const typed = window.prompt('Вкажіть ваш Telegram username (без @)');
  const username = typed?.trim().replace('@', '');
  if (!username) throw new Error('Telegram username required');
  return { id: username, username };
}

async function getGoogleAuthData(): Promise<{ id: string; email: string; name: string }> {
  await loadGoogleIdentityScript();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID not configured');
  }

  return new Promise((resolve, reject) => {
    const google = (window as any)?.google;
    if (!google) return reject(new Error('Google API not loaded'));
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (r: any) => {
        const d = parseJwt(r.credential);
        resolve({ id: d.sub, email: d.email, name: d.name });
      },
    });
    google.accounts.id.prompt();
  });
}

function parseJwt(token: string) {
  return JSON.parse(atob(token.split('.')[1]));
}

async function loadGoogleIdentityScript() {
  if ((window as any)?.google?.accounts?.id) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}
