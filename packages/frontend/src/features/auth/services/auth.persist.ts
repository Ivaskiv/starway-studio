// packages/frontend/src/features/auth/auth.persist.ts
const KEY = 'auth'

export function saveAuth(data: { accessToken: string; user: any }) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadAuth() {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY)
}
