import path from 'node:path'
import { readFile } from 'node:fs/promises'

import { CanonicalGatewayAgentRegistry } from '../../ai/agentRegistry.js'
import { buildGatewayPromptSources, resolveGatewayPromptRead } from '../../ai/gateway/index.js'

export type AdminAgentPromptCapabilityType = 'LIVE_AGENT' | 'PROMPT_ONLY' | 'KNOWLEDGE_TOOL'

export interface AdminAgentPromptReadResult {
  agentKey: string
  capabilityType: AdminAgentPromptCapabilityType
  promptId: string
  editablePrompt: boolean
  reason?: string
  promptContent: string | null
  content: string | null
  source: 'db' | 'filesystem' | null
  version: number | null
  sourceFiles: string[]
}

export interface AdminAgentReadResult extends AdminAgentPromptReadResult {
  name: string
  runtimeRegistered: boolean
  runtimeStatus: 'active' | 'running' | 'pending' | null
  providerPolicy: string | null
  analysisState: 'idle'
}

export type AdminPromptCatalogEntry = {
  agentKey: string
  capabilityType: AdminAgentPromptCapabilityType
  promptId: string
  sourceFiles: string[]
}

function toRepositoryRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath)
}

async function readPromptFilesInOrder(sourceFiles: readonly string[]): Promise<string | null> {
  const chunks: string[] = []

  for (const sourceFile of sourceFiles) {
    const absolutePath = path.resolve(process.cwd(), sourceFile)
    const content = (await readFile(absolutePath, 'utf8')).trim()
    if (!content) {
      continue
    }
    chunks.push(content)
  }

  if (chunks.length === 0) {
    return null
  }

  return chunks.join('\n\n')
}

function buildAdminPromptCatalog(): Map<string, AdminPromptCatalogEntry> {
  const registry = new CanonicalGatewayAgentRegistry()
  const catalog = new Map<string, AdminPromptCatalogEntry>()

  for (const registration of registry.listRegistrations()) {
    catalog.set(registration.key, {
      agentKey: registration.key,
      capabilityType: 'LIVE_AGENT',
      promptId: registration.runtime.prompt,
      sourceFiles: [...registration.display.sourceFiles],
    })
  }

  for (const source of buildGatewayPromptSources()) {
    for (const ownerAgentId of source.ownerAgentIds) {
      if (ownerAgentId.endsWith('_agent') || catalog.has(ownerAgentId)) {
        continue
      }

      catalog.set(ownerAgentId, {
        agentKey: ownerAgentId,
        capabilityType: ownerAgentId === 'zoom_recap' ? 'KNOWLEDGE_TOOL' : 'PROMPT_ONLY',
        promptId: source.id,
        sourceFiles: [toRepositoryRelativePath(source.filePath)],
      })
    }
  }

  return catalog
}

export function listAdminAgentPromptCatalog(): AdminPromptCatalogEntry[] {
  return [...buildAdminPromptCatalog().values()]
}

export function findAdminPromptCatalogEntryByAgentKey(agentKey: string): AdminPromptCatalogEntry | null {
  return buildAdminPromptCatalog().get(agentKey) ?? null
}

export function findAdminPromptCatalogEntriesByPromptId(promptId: string): AdminPromptCatalogEntry[] {
  return listAdminAgentPromptCatalog().filter((entry) => entry.promptId === promptId)
}

export async function readAdminAgentPrompt(agentKey: string): Promise<AdminAgentPromptReadResult | null> {
  const entry = buildAdminPromptCatalog().get(agentKey)
  if (!entry) {
    return null
  }

  if (entry.capabilityType === 'KNOWLEDGE_TOOL') {
    return {
      agentKey: entry.agentKey,
      capabilityType: entry.capabilityType,
      promptId: entry.promptId,
      editablePrompt: false,
      reason: 'Ця картка використовує knowledge/tool source, а не editable system prompt.',
      promptContent: null,
      content: null,
      source: null,
      version: null,
      sourceFiles: [...entry.sourceFiles],
    }
  }

  const prompt = await resolveGatewayPromptRead(entry.promptId)
  if (prompt?.source === 'db' && prompt.content.trim()) {
    return {
      agentKey: entry.agentKey,
      capabilityType: entry.capabilityType,
      promptId: entry.promptId,
      editablePrompt: true,
      promptContent: prompt.content,
      content: prompt.content,
      source: prompt.source,
      version: prompt.version,
      sourceFiles: [...entry.sourceFiles],
    }
  }

  const composedFilesystemPrompt = await readPromptFilesInOrder(entry.sourceFiles).catch(() => null)
  if (composedFilesystemPrompt?.trim()) {
    return {
      agentKey: entry.agentKey,
      capabilityType: entry.capabilityType,
      promptId: entry.promptId,
      editablePrompt: true,
      promptContent: composedFilesystemPrompt,
      content: composedFilesystemPrompt,
      source: 'filesystem',
      version: 0,
      sourceFiles: [...entry.sourceFiles],
    }
  }

  if (prompt?.content.trim()) {
    return {
      agentKey: entry.agentKey,
      capabilityType: entry.capabilityType,
      promptId: entry.promptId,
      editablePrompt: true,
      promptContent: prompt.content,
      content: prompt.content,
      source: prompt.source,
      version: prompt.version,
      sourceFiles: [...entry.sourceFiles],
    }
  }

  return {
    agentKey: entry.agentKey,
    capabilityType: entry.capabilityType,
    promptId: entry.promptId,
    editablePrompt: false,
    reason: `Для "${entry.promptId}" не знайдено active DB version або canonical filesystem source.`,
    promptContent: null,
    content: null,
    source: null,
    version: null,
    sourceFiles: [...entry.sourceFiles],
  }
}

export async function readAdminAgent(agentKey: string): Promise<AdminAgentReadResult | null> {
  const registry = new CanonicalGatewayAgentRegistry()
  const registration = registry.listRegistrations().find((item) => item.key === agentKey) ?? null
  const promptRead = await readAdminAgentPrompt(agentKey)
  const promptCatalogEntry = findAdminPromptCatalogEntryByAgentKey(agentKey)
  const promptOwner = promptRead ?? promptCatalogEntry

  if (!registration && !promptOwner) {
    return null
  }

  const capabilityType = promptRead?.capabilityType
    ?? promptCatalogEntry?.capabilityType
    ?? 'LIVE_AGENT'
  const promptId = promptRead?.promptId
    ?? promptCatalogEntry?.promptId
    ?? registration?.runtime.prompt
    ?? ''
  const sourceFiles = promptRead?.sourceFiles
    ?? promptCatalogEntry?.sourceFiles
    ?? [...(registration?.display.sourceFiles ?? [])]
  const providerPolicy =
    process.env.TELEGRAM_AGENT_GATEWAY_PROVIDER?.trim()
    || (process.env.NODE_ENV !== 'production' ? 'configured' : null)

  return {
    agentKey,
    name: registration?.display.name ?? agentKey,
    runtimeRegistered: Boolean(registration),
    runtimeStatus: registration?.display.status ?? null,
    providerPolicy,
    analysisState: 'idle',
    capabilityType,
    promptId,
    editablePrompt: promptRead?.editablePrompt ?? false,
    reason: promptRead?.reason,
    promptContent: promptRead?.promptContent ?? null,
    content: promptRead?.content ?? null,
    source: promptRead?.source ?? null,
    version: promptRead?.version ?? null,
    sourceFiles: [...sourceFiles],
  }
}
