// utils/checkEmail.ts
export const hasEmail = (email?: string) => typeof email === 'string' && email.trim() !== '';
