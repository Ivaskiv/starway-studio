import type { Response } from "express"
import type { AuthenticatedRequest } from "../../../types/globalTypes.js"
import { trackEvent } from "../../events/service.js"
import { resolveUserState } from "../../telegram-mentor/handlers/start.js"
import { resolveTelegramProductSummary } from "../../telegram-mentor/services/product/summary.js"
import { getUserSubscriptionInfo, getUserSubscriptions } from "../index.js"

/** GET /api/subscriptions/status — поточний стан підписки + cooldown */
export async function getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const [data, productSummary] = await Promise.all([
      getUserSubscriptionInfo(userId),
      resolveTelegramProductSummary(userId).catch(() => null),
    ]);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscription_status_viewed',
      source: 'web',
      state,
      payload: {
        status: data.subscription?.status ?? null,
      },
    })
    return res.json({
      success: true,
      ...data,
      productRooms: productSummary?.webRooms ?? [],
      primaryProductRoom: productSummary?.primary
        ? {
            key: productSummary.primary.key,
            title: productSummary.primary.title,
            state: productSummary.primary.state,
            selectedFlow: productSummary.primary.selectedFlow,
            roomId: productSummary.primary.roomId,
            accessSource: productSummary.primary.accessSource,
            mentorMode: productSummary.primary.mentorMode,
            activationState: productSummary.primary.activationState,
            progressState: productSummary.primary.progressState,
            reminderState: productSummary.primary.reminderState,
            gamificationState: productSummary.primary.gamificationState,
            behaviorPolicy: productSummary.primary.behaviorPolicy,
            behaviorState: productSummary.primary.behaviorState,
            upsellState: productSummary.primary.upsellState,
            retentionState: productSummary.primary.retentionState,
            paymentUrl: productSummary.primary.paymentUrl,
            openUrl: productSummary.primary.openUrl,
            progressUrl: productSummary.primary.progressUrl,
          }
        : null,
      productProgress: productSummary?.progress ?? null,
    });
  } catch (err) {
    console.error('❌ getSubscriptionStatus error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/subscriptions — всі підписки юзера */
export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const subscriptions = await getUserSubscriptions(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscriptions_list_viewed',
      source: 'web',
      state,
      payload: {
        count: subscriptions.length,
      },
    })
    return res.json({ success: true, subscriptions });
  } catch (err) {
    console.error('❌ listSubscriptions error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
