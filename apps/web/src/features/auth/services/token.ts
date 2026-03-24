const KEY = 'starway_access_token';
const SESSION_HINT_KEY = 'starway_session_hint';

// export const getToken = (): string | null => localStorage.getItem(KEY);

export const getToken = () => {
  return localStorage.getItem('starway_access_token');
};
export const hasSessionHint = () => localStorage.getItem(SESSION_HINT_KEY) === '1';
export const saveToken = (token: string) => {
  localStorage.setItem(KEY, token);
  localStorage.setItem(SESSION_HINT_KEY, '1');
};
export const removeToken = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SESSION_HINT_KEY);
};

export default { saveToken, getToken, removeToken, hasSessionHint };
