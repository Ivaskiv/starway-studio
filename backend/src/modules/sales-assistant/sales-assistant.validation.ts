import { prisma } from '@/db/client.js'

export async function validateOutput(
  text: string,
  profileKey: string,
): Promise<{ valid: boolean; reason?: string }> {
  const forbidden = await prisma.lexicon.findMany({
    where: { profileKey, type: 'FORBIDDEN' },
    select: { word: true },
  })

  const lower = text.toLowerCase()
  const found = forbidden.filter((item) => lower.includes(item.word.toLowerCase()))

  if (found.length > 0) {
    return { valid: false, reason: `forbidden: ${found.map((f) => f.word).join(', ')}` }
  }

  if (!/(\?|→|❌|✅|\.\.\.)/.test(text.trim().slice(-60))) {
    return { valid: false, reason: 'missing CTA or open question at end' }
  }

  return { valid: true }
}