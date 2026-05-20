export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function isStaleRequest(
  expectedRequestId: string,
  currentRequestId: string | null
): boolean {
  return !currentRequestId || currentRequestId !== expectedRequestId
}

export class RequestGuard {
  private controller: AbortController | null = null

  abortInFlight(): void {
    this.controller?.abort()
    this.controller = null
  }

  begin(): AbortSignal {
    this.abortInFlight()
    this.controller = new AbortController()
    return this.controller.signal
  }

  clear(): void {
    this.controller = null
  }

  get signal(): AbortSignal | undefined {
    return this.controller?.signal
  }
}

export class SubmitLock {
  private locked = false

  tryAcquire(): boolean {
    if (this.locked) return false
    this.locked = true
    return true
  }

  release(): void {
    this.locked = false
  }

  get isLocked(): boolean {
    return this.locked
  }
}
