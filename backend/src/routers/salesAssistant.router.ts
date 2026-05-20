import { Router, type Response } from 'express'

import { prisma } from '../db/client.js'
import {
  requireSalesAssistantAccess,
  type SalesAssistantRequest,
} from '../middleware/salesAssistantGuard.js'
import {
  generateContent,
  getWorkspace,
  getHistory,
  getTooltips,
  updateWorkspace,
  type SalesAssistantGenerateBody,
  type UpdateSalesAssistantWorkspaceBody,
} from '../services/salesAssistant.service.js'

const router: Router = Router()

router.get('/workspace', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  if (!req.aiWorkspaceId) {
    res.status(403).json({ message: 'AI Workspace не ініціалізовано.' })
    return
  }

  res.json(await getWorkspace(req.aiWorkspaceId))
})

router.put('/workspace', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  if (!req.aiWorkspaceId) {
    res.status(403).json({ message: 'AI Workspace не ініціалізовано.' })
    return
  }

  res.json(await updateWorkspace(req.aiWorkspaceId, req.body as UpdateSalesAssistantWorkspaceBody))
})

router.post('/generate', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  try {
    const body = req.body as SalesAssistantGenerateBody
    const userId = req.user?.id ?? ''
    res.json(await generateContent(req.aiWorkspaceId ?? null, body, req.aiProfile ?? null, userId))
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Generation failed' })
  }
})

router.get('/history', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  if (!req.aiWorkspaceId) {
    res.status(403).json({ message: 'AI Workspace не ініціалізовано.' })
    return
  }

  res.json(await getHistory(
    req.aiWorkspaceId,
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
  ))
})

router.get('/tooltips', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  res.json(await getTooltips(req.aiProfile?.id ?? ''))
})

router.get('/templates', requireSalesAssistantAccess, (_req: SalesAssistantRequest, res: Response) => {
  res.json([
    { key: 'WARMUP_3DAYS', label: 'Прогрів 3 дні', model: 'gpt' },
    { key: 'REELS_SCENARIO', label: 'Reels сценарій', model: 'gpt' },
    { key: 'STORIES_CHECK', label: 'Аудит сторіс', model: 'gemini' },
    { key: 'BLOG_IDEAS', label: 'Ідеї для блогу', model: 'claude' },
    { key: 'CUSTOM', label: 'Довільний запит', model: 'claude' },
  ])
})

router.get('/lexicon', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  if (!req.aiProfile) { res.status(400).json({ error: 'No profile' }); return }
  res.json(await prisma.lexicon.findMany({ where: { profileKey: req.aiProfile.key } }))
})

router.post('/lexicon', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  if (!req.aiProfile) { res.status(400).json({ error: 'No profile' }); return }
  const { word, type } = req.body as { word: string; type: 'REQUIRED' | 'FORBIDDEN' }
  if (!word || !type) { res.status(400).json({ error: 'word and type required' }); return }
  const item = await prisma.lexicon.create({
    data: { profileKey: req.aiProfile.key, word: word.trim(), type, addedBy: req.user?.id ?? 'user' },
  })
  res.json(item)
})

router.delete('/lexicon/:id', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  await prisma.lexicon.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.get('/campaign-memory', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const memory = await prisma.campaignMemory.findFirst({
    where: { userId, isActive: true },
  })
  res.json(memory ?? null)
})

router.put('/campaign-memory', requireSalesAssistantAccess, async (req: SalesAssistantRequest, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { launchContext, audienceTemp, objections, resistance } =
    req.body as {
      launchContext: string
      audienceTemp: string
      objections: string
      resistance: string
    }

  await prisma.campaignMemory.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  })

  const memory = await prisma.campaignMemory.create({
    data: { userId, launchContext, audienceTemp, objections, resistance },
  })
  res.json(memory)
})

export default router
