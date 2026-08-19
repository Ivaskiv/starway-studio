import type { Context } from 'telegraf'

import { getTelegramAgentGateway, type IAgentGateway } from '../../../ai/gateway/index.js'
import type { TelegramTextRoute } from '../../router/messageRouter.js'
import {
  resolveTelegramScenarioHandler,
  type TelegramConversationScenarioContext,
} from './scenarioRegistry.js'
import type { ConversationResponse } from './types.js'

export interface TelegramConversationEngineInput {
  chatId: string
  userId: string | null
  text: string
  route: TelegramTextRoute
}

export class TelegramConversationEngine {
  constructor(
    private readonly gateway: IAgentGateway = getTelegramAgentGateway(),
  ) {}

  async execute(ctx: Context, input: TelegramConversationEngineInput): Promise<ConversationResponse> {
    const scenario = resolveTelegramScenarioHandler(input.route)

    const context: TelegramConversationScenarioContext = {
      ctx,
      chatId: input.chatId,
      userId: input.userId,
      text: input.text,
      route: input.route,
      gateway: this.gateway,
    }

    return scenario(context)
  }
}
