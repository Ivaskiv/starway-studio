import type { BehavioralContinuityResolution } from '../continuity/behavioralContinuity.js'
import type { TelegramFlowId } from './flowRegistry.js'

export interface TelegramFlowBlock {
  type: string
  tone: 'soft' | 'behavioral' | 'focused' | 'strategic' | 'continuation'
  priority: number
  title?: string
  body?: readonly string[]
}

export type TelegramButton =
  | {
      text: string
      callback_data: string
      url?: never
      web_app?: never
    }
  | {
      text: string
      url: string
      callback_data?: never
      web_app?: never
    }
  | {
      text: string
      web_app: { url: string }
      callback_data?: never
      url?: never
    }

export interface TelegramFlow {
  id: TelegramFlowId | string
  title: string
  body: readonly string[]
  buttons: readonly TelegramButton[][]
  blocks: readonly TelegramFlowBlock[]
}

export function createTelegramFlow(base: Omit<TelegramFlow, 'blocks'> & { blocks?: TelegramFlowBlock[] }): TelegramFlow {
  return {
    ...base,
    blocks: base.blocks ?? [],
  }
}

export function buildContinuityBlocks(resolution: BehavioralContinuityResolution): TelegramFlowBlock[] {
  const blocks: TelegramFlowBlock[] = []

  blocks.push({
    type: 'context_reconnection',
    tone: 'soft',
    priority: 1,
    body: resolution.relationship?.lastMeaningfulGoal ? [resolution.relationship.lastMeaningfulGoal] : [],
  })

  if (resolution.repeatedPattern) {
    blocks.push({
      type: 'repeated_pattern',
      tone: 'behavioral',
      priority: 2,
      body: [resolution.repeatedPattern],
    })
  }

  blocks.push({
    type: 'next_meaningful_action',
    tone: 'focused',
    priority: 3,
    body: [resolution.recommendedNextAction],
  })

  return blocks
}
