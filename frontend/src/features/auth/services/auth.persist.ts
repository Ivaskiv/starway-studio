// frontend/src/features/auth/services/auth.persist.ts
const KEYS = { TOKEN: 'starway_auth_token', USER: 'starway_user' } as const;

const get = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCredentials = (c: { user: unknown; accessToken: string }) => {
  localStorage.setItem(KEYS.TOKEN, JSON.stringify(c.accessToken));
  localStorage.setItem(KEYS.USER, JSON.stringify(c.user));
};

export const loadCredentials = () => {
  const accessToken = get<string>(KEYS.TOKEN);
  const user = get<any>(KEYS.USER);
  return accessToken && user ? { accessToken, user } : null;
};

export const clearCredentials = () => {
  localStorage.removeItem(KEYS.TOKEN);
  localStorage.removeItem(KEYS.USER);
};

export const getToken = () => get<string>(KEYS.TOKEN);
export const updateToken = (t: string) => localStorage.setItem(KEYS.TOKEN, JSON.stringify(t));
export const hasStoredCredentials = () => getToken() !== null;