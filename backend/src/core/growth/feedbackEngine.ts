type FeedbackBucket = {
  success: number
  fail: number
}

type PendingExpectation = {
  key: string
  createdAt: number
}

const feedbackStore = new Map<string, FeedbackBucket>()
const pendingByUser = new Map<string, PendingExpectation>()
const FAIL_WINDOW_MS = 12 * 60 * 60 * 1000

function getBucket(key: string): FeedbackBucket {
  const existing = feedbackStore.get(key)
  if (existing) return existing

  const created: FeedbackBucket = { success: 0, fail: 0 }
  feedbackStore.set(key, created)
  return created
}

export function buildFeedbackKey(pattern: string | null, intent: string, intervention: string) {
  return [pattern ?? 'none', intent, intervention].join(':')
}

export function rememberExpectedAction(userId: string, key: string, timestamp = Date.now()) {
  pendingByUser.set(userId, { key, createdAt: timestamp })
  console.log('[FEEDBACK]', { userId, key, status: 'expected_action_registered', timestamp })
}

export function recordSuccess(key: string) {
  const bucket = getBucket(key)
  bucket.success += 1
  console.log('[FEEDBACK]', { key, status: 'success', rate: getSuccessRate(key) })
}

export function recordFail(key: string) {
  const bucket = getBucket(key)
  bucket.fail += 1
  console.log('[FEEDBACK]', { key, status: 'fail', rate: getSuccessRate(key) })
}

export function recordSuccessForUser(userId: string) {
  const pending = pendingByUser.get(userId)
  if (!pending) {
    console.log('[FEEDBACK]', { userId, status: 'success_skipped', reason: 'no_pending_expectation' })
    return null
  }

  recordSuccess(pending.key)
  pendingByUser.delete(userId)
  return pending.key
}

export function recordFailForUser(userId: string, now = Date.now()) {
  const pending = pendingByUser.get(userId)
  if (!pending) {
    console.log('[FEEDBACK]', { userId, status: 'fail_skipped', reason: 'no_pending_expectation' })
    return null
  }

  if (now - pending.createdAt < FAIL_WINDOW_MS) {
    console.log('[FEEDBACK]', {
      userId,
      key: pending.key,
      status: 'fail_skipped',
      reason: 'window_not_elapsed',
    })
    return null
  }

  recordFail(pending.key)
  pendingByUser.delete(userId)
  return pending.key
}

export function getSuccessRate(key: string) {
  const bucket = getBucket(key)
  const total = bucket.success + bucket.fail
  return total === 0 ? 1 : bucket.success / total
}

export function getFeedbackSnapshot(key: string) {
  const bucket = getBucket(key)
  return {
    ...bucket,
    rate: getSuccessRate(key),
  }
}
