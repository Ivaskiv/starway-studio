export function getSessionAnswersFromContent(content: any, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object') return null
  return content[session] ?? null
}

export function getSessionMeta(content: any, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object') return null
  return content[session === 'morning' ? 'morningMeta' : 'eveningMeta'] ?? null
}

export function getSessionResumeIndex(content: any, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  return meta?.lastQuestionIndex ?? 0
}

export function getSessionCompletedAt(content: any, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  return meta?.completedAt ?? null
}