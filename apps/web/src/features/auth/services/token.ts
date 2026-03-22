const KEY = 'starway_access_token';

// export const getToken = (): string | null => localStorage.getItem(KEY);

export const getToken = () => {
  return localStorage.getItem('starway_access_token');
};
export const saveToken = (token: string) => localStorage.setItem(KEY, token);
export const removeToken = () => localStorage.removeItem(KEY);

export default { saveToken, getToken, removeToken };
