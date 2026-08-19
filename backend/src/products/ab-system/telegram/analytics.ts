import type { Prisma } from '@starway/db/prisma-client'

import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { trackEvent } from '../../../modules/events/service.js'

export async function trackAbTestEvent(input: {
  userId: string
  type: string
  state?: string | null
  payload?: Prisma.JsonObject
  source?: 'telegram' | 'web' | 'miniapp'
}) {
  await trackEvent({
    userId: input.userId,
    type: input.type,
    source: input.source ?? 'telegram',
    state: input.state ?? null,
    payload: {
      funnel: 'ab_test',
      ...input.payload,
      security: {
        request_fingerprint: buildRequestFingerprint({
          method: 'telegram',
          path: input.type,
          userId: input.userId,
          payload: input.payload ?? {},
        }),
        replay_attempt: false,
        suspicious_activity: false,
        webhook_trust_source: 'telegram',
      },
    } satisfies Prisma.JsonObject,
  })
}
