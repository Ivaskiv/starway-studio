type FlowTask<T> = () => Promise<T>

type FlowQueueState = {
  chain: Promise<unknown>
  depth: number
}

const perChatFlowQueue = new Map<string, FlowQueueState>()

export function getFlowQueueDepth(chatId: string): number {
  return perChatFlowQueue.get(chatId)?.depth ?? 0
}

export async function runInPerChatFlow<T>(
  chatId: string | number,
  task: FlowTask<T>,
): Promise<T> {
  const key = String(chatId)
  const existing = perChatFlowQueue.get(key) ?? {
    chain: Promise.resolve(),
    depth: 0,
  }

  existing.depth += 1
  perChatFlowQueue.set(key, existing)

  const run = existing.chain.then(task)

  existing.chain = run
    .catch(() => undefined)
    .finally(() => {
      const current = perChatFlowQueue.get(key)
      if (!current) return

      current.depth = Math.max(0, current.depth - 1)

      if (current.depth === 0) {
        perChatFlowQueue.delete(key)
      }
    })

  return run
}
