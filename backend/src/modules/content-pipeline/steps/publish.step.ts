import type { MediaAssets, PipelineContext } from '../pipeline.types.js'

export async function publishContent(
  context: PipelineContext,
  assets: MediaAssets,
  caption: string,
): Promise<{ instagram?: string; telegram?: number }> {
  const results: { instagram?: string; telegram?: number } = {}

  const [igResult, tgResult] = await Promise.allSettled([
    publishToInstagram(assets.finalVideo || assets.scenes[0], caption),
    publishToTelegram(context, assets, caption),
  ])

  if (igResult.status === 'fulfilled' && igResult.value) results.instagram = igResult.value
  if (tgResult.status === 'fulfilled' && tgResult.value) results.telegram = tgResult.value

  return results
}

async function publishToInstagram(videoUrl: string, caption: string): Promise<string> {
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!token || !accountId || !videoUrl) {
    return ''
  }

  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption,
      access_token: token,
    }),
  })

  if (!containerRes.ok) {
    throw new Error(`Instagram container error: ${containerRes.status}`)
  }

  const container = await containerRes.json() as { id?: string }
  if (!container.id) throw new Error('Instagram container id missing')

  await waitForInstagramProcessing(container.id, token)

  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  })

  if (!publishRes.ok) {
    throw new Error(`Instagram publish error: ${publishRes.status}`)
  }

  const published = await publishRes.json() as { id?: string }
  return published.id ?? ''
}

async function waitForInstagramProcessing(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10_000))
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${token}`,
    )
    if (!res.ok) continue

    const data = await res.json() as { status_code?: string }
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error('Instagram processing failed')
  }

  throw new Error('Instagram processing timeout')
}

async function publishToTelegram(
  _context: PipelineContext,
  assets: MediaAssets,
  caption: string,
): Promise<number> {
  const channelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const videoUrl = assets.finalVideo || assets.scenes[0]

  if (!channelId || !botToken || !videoUrl) {
    return 0
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      video: videoUrl,
      caption,
      parse_mode: 'HTML',
    }),
  })

  if (!res.ok) {
    throw new Error(`Telegram channel publish error: ${res.status}`)
  }

  const data = await res.json() as { result?: { message_id?: number } }
  return data.result?.message_id ?? 0
}
