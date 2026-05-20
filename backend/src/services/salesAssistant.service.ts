import type { Prisma } from '@starway/db/prisma-client'
import { anthropic, gemini, openai } from '@starway/ai/providers'
import { AI_MODELS } from '@starway/ai/providers/models'

import { prisma } from '../db/client.js'
import {
  compilePrompt,
  type AiBehaviorProfile,
  type ModelProvider,
} from '../modules/ai-assistant/promptCompiler.js'

export type SalesAssistantGenerateBody = {
  contentType: string
  selectedProtocol: string
  selectedOutputs: string[]
  userContext: string
  userRequest: string
}

export type UpdateSalesAssistantWorkspaceBody = {
  activeProfileId?: string | null
}

export type SalesAssistantWorkspaceResponse = {
  id: string
  isActive: boolean
  allowedModels: string[]
  maxTokensPerMonth: number
  usedTokensThisMonth: number
  activeProfile: {
    id: string
    key: string
    name: string
    description: string | null
    supportedOutputs: string[]
    supportedProtocols: Prisma.JsonValue
  } | null
}

function resolveModel(contentType: string): ModelProvider {
  if (contentType === 'STORIES_CHECK') return 'gemini'
  if (['BLOG_IDEAS', 'CUSTOM'].includes(contentType)) return 'claude'
  return 'gpt'
}

export async function generateContent(
  workspaceId: string | null,
  body: SalesAssistantGenerateBody,
  aiProfile: AiBehaviorProfile | null,
  requestUserId = '',
) {
  const profile = aiProfile ?? await prisma.aiBehaviorProfile.findFirst({
    where: { key: 'STARWAY_OGOLENA_PRAVDA' },
  })
  if (!profile) {
    throw new Error('AiBehaviorProfile STARWAY_OGOLENA_PRAVDA not found in DB. Run seed.')
  }

  const model = resolveModel(body.contentType)

  const userId = workspaceId
    ? ((await prisma.userAiWorkspace.findUnique({
        where: { id: workspaceId },
        select: { userId: true },
      }))?.userId ?? '')
    : requestUserId

  const systemPrompt = await compilePrompt(profile, {
    userId,
    selectedOutputs: body.selectedOutputs,
    selectedProtocol: body.selectedProtocol,
    userContext: body.userContext,
    userRequest: body.userRequest,
  }, model)

  let result = ''
  let tokensUsed = 0

  if (model === 'claude') {
    const response = await anthropic.messages.create({
      model: AI_MODELS.CLAUDE_MAIN,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: body.userRequest }],
    })
    result = response.content.find(block => block.type === 'text')?.text ?? ''
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  } else if (model === 'gemini') {
    const response = await gemini
      .getGenerativeModel({ model: AI_MODELS.GEMINI_AUDIT })
      .generateContent(`${systemPrompt}\n\n${body.userRequest}`)
    result = response.response.text()
  } else {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_MAIN,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.userRequest },
      ],
    })
    result = response.choices[0]?.message?.content ?? ''
    tokensUsed = response.usage?.total_tokens ?? 0
  }

  const validation = await validateOutput(result, profile.key)
  if (!validation.valid) {
    console.warn(`[STARWAY] validation failed: ${validation.reason}`)
  }

  let generationId: string | undefined
  if (workspaceId) {
    const generation = await prisma.salesAssistantGeneration.create({
      data: {
        workspaceId,
        contentType: body.contentType,
        modelUsed: model,
        protocol: body.selectedProtocol,
        userContext: body.userContext,
        request: body.userRequest,
        result,
        tokensUsed,
      },
    })
    generationId = generation.id

    await prisma.userAiWorkspace.update({
      where: { id: workspaceId },
      data: { usedTokensThisMonth: { increment: tokensUsed } },
    })
  }

  return {
    id: generationId,
    content: result,
    modelUsed: model,
    contentType: body.contentType,
    protocol: body.selectedProtocol,
    tokensUsed,
    validationWarning: validation.valid ? undefined : validation.reason,
  }
}

async function validateOutput(
  text: string,
  profileKey: string,
): Promise<{ valid: boolean; reason?: string }> {
  const forbidden = await prisma.lexicon.findMany({
    where: { profileKey, type: 'FORBIDDEN' },
    select: { word: true },
  })

  const normalizedText = text.toLowerCase()
  const found = forbidden.filter((item) => normalizedText.includes(item.word.toLowerCase()))

  if (found.length > 0) {
    return { valid: false, reason: `forbidden: ${found.map((item) => item.word).join(', ')}` }
  }

  if (!/(\?|→|❌|✅|\.\.\.)/.test(text.trim().slice(-60))) {
    return { valid: false, reason: 'missing CTA or open question at end' }
  }

  return { valid: true }
}

export async function getWorkspace(workspaceId: string): Promise<SalesAssistantWorkspaceResponse | null> {
  return prisma.userAiWorkspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      isActive: true,
      allowedModels: true,
      maxTokensPerMonth: true,
      usedTokensThisMonth: true,
      activeProfile: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          supportedOutputs: true,
          supportedProtocols: true,
        },
      },
    },
  })
}

export async function updateWorkspace(
  workspaceId: string,
  body: UpdateSalesAssistantWorkspaceBody,
): Promise<SalesAssistantWorkspaceResponse> {
  return prisma.userAiWorkspace.update({
    where: { id: workspaceId },
    data: {
      ...(body.activeProfileId !== undefined ? { activeProfileId: body.activeProfileId } : {}),
    },
    select: {
      id: true,
      isActive: true,
      allowedModels: true,
      maxTokensPerMonth: true,
      usedTokensThisMonth: true,
      activeProfile: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          supportedOutputs: true,
          supportedProtocols: true,
        },
      },
    },
  })
}

export async function getHistory(workspaceId: string, page = 1, limit = 20) {
  return prisma.salesAssistantGeneration.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

export async function getTooltips(profileId: string) {
  return prisma.aiTooltip.findMany({ where: { profileId } })
}
