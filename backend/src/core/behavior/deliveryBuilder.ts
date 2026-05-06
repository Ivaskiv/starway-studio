import type { ChannelContext } from '../orchestrator/channelRouter.js'
import { adaptMessageForChannel, resolveChannel } from '../orchestrator/channelRouter.js'
import { runMentor } from '../mentor/mentorEngine.js'
import type { BehaviorInput, Intent, MentorDelivery } from '../mentor/types.js'
import type { Pattern } from './types.js'

export function normalizeBehaviorChannelContext(
  channelContext?: Partial<ChannelContext>,
): ChannelContext {
  return {
    lastActiveChannel: channelContext?.lastActiveChannel ?? null,
    telegramConnected: channelContext?.telegramConnected ?? true,
    webSessionActive: channelContext?.webSessionActive ?? true,
    miniappActive: channelContext?.miniappActive ?? false,
    lastSeenAt: channelContext?.lastSeenAt ?? 0,
  }
}

export function buildBehaviorDelivery(
  input: BehaviorInput,
  intent: Intent,
  patterns: Pattern[],
  channelContext?: Partial<ChannelContext>,
): MentorDelivery {
  const context = normalizeBehaviorChannelContext(channelContext)
  const channel = resolveChannel(intent, patterns[0] ?? null, context)
  const mentor = runMentor(input, { channel })
  const adapted = adaptMessageForChannel(mentor.message, channel)

  return {
    channel,
    adaptedMessage: adapted.text,
  }
}
