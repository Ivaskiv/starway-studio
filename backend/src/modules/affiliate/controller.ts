import type { Response } from "express"
import type { AuthenticatedRequest } from "../../types/globalTypes.js"
import { createAffiliateLink } from "./service.js"
import { trackEvent } from "../events/service.js"
import { resolveUserState } from "../telegram-mentor/handlers/start.js"

/*
створює affiliate link
*/

export async function createAffiliate(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const { productId } = req.body

  const link = await createAffiliateLink(userId, productId)
  const state = await resolveUserState(userId).catch(() => null)
  await trackEvent({
    userId,
    type: 'web_affiliate_link_created',
    source: 'web',
    state,
    payload: {
      productId,
      affiliateLinkId: link.id,
      code: link.code,
    },
  })

  res.json(link)
}
