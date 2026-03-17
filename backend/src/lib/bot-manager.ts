// backend/src/lib/bot-manager.ts

export async function reloadExpertBot(expertId: string) {
  if (!expertId) return
  console.log('[bot-manager] reloadExpertBot called for', expertId)
}

export async function stopExpertBot(expertId: string) {
  if (!expertId) return
  console.log('[bot-manager] stopExpertBot called for', expertId)
}
