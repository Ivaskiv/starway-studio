import type { DeliveryMessage, DeliveryUser } from './types.js'

export class InAppDeliveryAdapter {
  async send(_user: DeliveryUser, _message: DeliveryMessage): Promise<boolean> {
    return true
  }
}

export const inAppDeliveryAdapter = new InAppDeliveryAdapter()

