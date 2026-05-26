type QueueTask<T> = () => Promise<T>

type QueueState = {
  chain: Promise<unknown>
  depth: number
}

const perChatQueue = new Map<string, QueueState>()

export function getQueueDepth(chatId: string): number {
  return perChatQueue.get(chatId)?.depth ?? 0
}

export async function runInPerChatQueue<T>(
  chatId: string,
  task: QueueTask<T>,
): Promise<T> {
  const existing = perChatQueue.get(chatId) ?? { chain: Promise.resolve(), depth: 0 }
  existing.depth += 1
  perChatQueue.set(chatId, existing)

  const run = existing.chain.then(task)
  existing.chain = run
    .catch(() => undefined)
    .finally(() => {
      const current = perChatQueue.get(chatId)
      if (!current) return
      current.depth = Math.max(0, current.depth - 1)
      if (current.depth === 0) {
        perChatQueue.delete(chatId)
      }
    })

  return run
}
