const KEY = 'starway_access_token';
const REFRESH_KEY = 'starway_refresh_token';
const SESSION_HINT_KEY = 'starway_session_hint';
const USER_KEY = 'starway_auth_user';
const KNOWN_USER_KEY = 'starway_known_user';

// export const getToken = (): string | null => localStorage.getItem(KEY);

export const getToken = () => {
  return localStorage.getItem('starway_access_token');
};
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_KEY);
};
export const hasSessionHint = () => localStorage.getItem(SESSION_HINT_KEY) === '1';
export const hasKnownUser = () => localStorage.getItem(KNOWN_USER_KEY) === '1';
export const resolvePreferredAuthMode = (requested: 'login' | 'register' = 'register') =>
  hasKnownUser() ? 'login' : requested;
export const getStoredUser = <T>() => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};
export const saveToken = (token: string) => {
  localStorage.setItem(KEY, token);
  localStorage.setItem(SESSION_HINT_KEY, '1');
  localStorage.setItem(KNOWN_USER_KEY, '1');
};
export const saveRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_KEY, token);
  localStorage.setItem(SESSION_HINT_KEY, '1');
  localStorage.setItem(KNOWN_USER_KEY, '1');
};
export const saveStoredUser = <T>(user: T) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_HINT_KEY, '1');
  localStorage.setItem(KNOWN_USER_KEY, '1');
};
export const removeToken = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(SESSION_HINT_KEY);
  localStorage.removeItem(USER_KEY);
};

export default { saveToken, saveRefreshToken, getToken, getRefreshToken, removeToken, hasSessionHint, hasKnownUser, resolvePreferredAuthMode, getStoredUser, saveStoredUser };
