export function getDraftKey(userId: string, session: 'morning' | 'evening', dateKey: string) {
  return `starway_daily_cycle_draft:${userId || 'guest'}:${session}:${dateKey}`
}

export function loadDraft(userId: string, session: 'morning' | 'evening', dateKey: string) {
  try {
    const raw = localStorage.getItem(getDraftKey(userId, session, dateKey))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDraft(userId: string, session: 'morning' | 'evening', dateKey: string, draft: any) {
  try {
    localStorage.setItem(getDraftKey(userId, session, dateKey), JSON.stringify(draft))
  } catch {}
}

export function clearDraft(userId: string, session: 'morning' | 'evening', dateKey: string) {
  try {
    localStorage.removeItem(getDraftKey(userId, session, dateKey))
  } catch {}
}