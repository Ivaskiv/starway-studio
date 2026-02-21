// frontend/src/features/auth/services/token.ts
const KEY = 'starway_token'

export const saveToken   = (token: string) => localStorage.setItem(KEY, token)
export const getToken    = (): string | null => localStorage.getItem(KEY)
export const removeToken = () => localStorage.removeItem(KEY)

export default { saveToken, getToken, removeToken }