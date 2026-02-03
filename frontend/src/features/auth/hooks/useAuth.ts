// frontend/src/features/auth/hooks/useAuth.ts
import { useSelector } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsLoading,
} from '@/features/auth/services/auth.slice';
import {
  useLoginMutation,
  useRegisterMutation,
  useSocialAuthMutation,
} from '@/features/auth/services/auth.api';

export function useAuth() {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);

  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const [socialAuth] = useSocialAuthMutation();

  const loginWithCredentials = (data: { email: string; password: string }) => login(data).unwrap();

  const registerWithCredentials = (data: {
    name?: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) => {
    // API чекає тільки name/email/password
    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
    };

    return register(payload).unwrap();
  };

  const loginWithSocial = async (
    provider: 'google' | 'telegram'
  ): Promise<{ isNewUser: boolean; email?: string }> => {
    const res = await socialAuth({ provider }).unwrap();

    return {
      isNewUser: res.is_new_user,
      email: res.user?.email,
    };
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithCredentials,
    registerWithCredentials,
    loginWithSocial,
  };
}
