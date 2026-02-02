// frontend/src/features/auth/hooks/useAuth.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { SocialPlatform } from '@/features/social/types/social.types';
import { setCredentials, clearAuth } from '../services/auth.slice';
import {
  useLoginMutation,
  useRegisterMutation,
  useSocialAuthMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} from '../services/auth.api';
import type { LoginFormData } from '../components/LoginForm';
import type { RegisterFormData } from '../components/RegisterForm';
import { getTelegramToken } from '@/features/auth/utils/social.utils';

const googleTokenCache: { token?: string } = {};

export function useAuth(onClose: () => void) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user, accessToken } = useAppSelector(state => state.auth);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverError, setServerError] = useState<string | undefined>();
  const [autoFillEmail, setAutoFillEmail] = useState<string | undefined>();

  const refreshAttempted = useRef(false);

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [register, { isLoading: registerLoading }] = useRegisterMutation();
  const [socialAuth, { isLoading: socialLoading }] = useSocialAuthMutation();
  const [refreshToken] = useRefreshTokenMutation();
  const [logout] = useLogoutMutation();

  // Автоматичний refresh тільки один раз при старті, якщо токена немає
  useEffect(() => {
    if (accessToken || refreshAttempted.current) return;

    refreshAttempted.current = true;
    refreshToken()
      .unwrap()
      .then(data => {
        dispatch(setCredentials({ user: data.user, accessToken: data.token }));
      })
      .catch(() => dispatch(clearAuth()));
  }, [accessToken, refreshToken, dispatch]);

  // Логін
  const handleLogin = useCallback(
    async (data: LoginFormData) => {
      setServerError(undefined);
      try {
        const result = await login(data).unwrap();
        dispatch(setCredentials({ user: result.user, accessToken: result.token }));
        toast.success('Вхід успішний 👋');
        onClose();
        navigate('/dashboard');
      } catch (err: any) {
        const msg = err?.data?.message || 'Помилка входу';
        setServerError(msg);
        toast.error(msg);
      }
    },
    [dispatch, login, navigate, onClose],
  );

  // Реєстрація
  const handleRegister = useCallback(
    async (data: RegisterFormData) => {
      setServerError(undefined);
      if (data.password !== data.confirmPassword) {
        setServerError('Паролі не співпадають');
        toast.error('Паролі не співпадають');
        return;
      }
      try {
        const result = await register({
          name: data.name,
          email: data.email,
          password: data.password,
        }).unwrap();
        dispatch(setCredentials({ user: result.user, accessToken: result.token }));
        toast.success('Реєстрація успішна 🎉');
        onClose();
        navigate('/dashboard');
      } catch (err: any) {
        const msg = err?.data?.error === 'email_already_registered'
          ? 'Цей email вже зареєстрований'
          : err?.data?.message || 'Помилка реєстрації';
        setServerError(msg);
        toast.error(msg);
      }
    },
    [dispatch, register, navigate, onClose],
  );

  // Соціальна авторизація
  const handleSocialAuth = useCallback(
    async (platform: SocialPlatform) => {
      setServerError(undefined);
      try {
        let token: string;

        if (platform === 'google') {
          const win = window as any;
          if (googleTokenCache.token) {
            token = googleTokenCache.token;
          } else {
            if (!win.google?.accounts?.oauth2) throw new Error('Google API не завантажено');
            token = await new Promise<string>((resolve, reject) => {
              const client = win.google.accounts.oauth2.initTokenClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                scope: 'email profile openid',
                callback: (res: { access_token?: string }) => {
                  if (res.access_token) {
                    googleTokenCache.token = res.access_token;
                    resolve(res.access_token);
                  } else {
                    reject(new Error('Не отримано токен'));
                  }
                },
              });
              client.requestAccessToken();
            });
          }
        } else if (platform === 'telegram') {
          token = await getTelegramToken();
        } else {
          throw new Error('Невідома платформа');
        }

        const result = await socialAuth({ provider: platform, token }).unwrap();

        if (result.isNewUser) {
          setAutoFillEmail(result.user.email);
          setMode('register');
          toast('Завершіть реєстрацію');
        } else {
          dispatch(setCredentials({ user: result.user, accessToken: result.token }));
          toast.success(`Вхід через ${platform} успішний 👋`);
          onClose();
          navigate('/dashboard');
        }
      } catch (err: any) {
        const msg = err?.message || `Не вдалося авторизуватись через ${platform}`;
        setServerError(msg);
        toast.error(msg);
      }
    },
    [dispatch, socialAuth, navigate, onClose],
  );

  // Логаут
  const handleLogout = useCallback(async () => {
    try {
      await logout().unwrap();
    } finally {
      dispatch(clearAuth());
      navigate('/');
    }
  }, [dispatch, logout, navigate]);

  return {
    mode,
    setMode,
    autoFillEmail,
    serverError,
    loginLoading,
    registerLoading,
    socialLoading,
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    handleLogin,
    handleRegister,
    handleSocialAuth,
    handleLogout,
  };
}