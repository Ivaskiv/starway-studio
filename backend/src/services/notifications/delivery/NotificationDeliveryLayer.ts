import { inAppDeliveryAdapter } from './InAppDeliveryAdapter.js'
import { telegramDeliveryAdapter } from './TelegramDeliveryAdapter.js'
import type { DeliveryMessage, DeliveryUser, NotificationDeliveryAdapter } from './types.js'

export class NotificationDeliveryLayer implements NotificationDeliveryAdapter {
  async sendTelegram(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    return telegramDeliveryAdapter.send(user, message)
  }

  async sendInApp(user: DeliveryUser, message: DeliveryMessage): Promise<boolean> {
    return inAppDeliveryAdapter.send(user, message)
  }
}

export const notificationDeliveryLayer = new NotificationDeliveryLayer()

