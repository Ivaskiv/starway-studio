export interface DeliveryUser {
  id: string
  firstName: string | null
  email: string | null
  telegramChatId: string | null
  telegramUserId: string | null
  telegramLinks: Array<{ chatId: string | null }>
}

export interface DeliveryMessage {
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
}

export interface NotificationDeliveryAdapter {
  sendTelegram(user: DeliveryUser, message: DeliveryMessage): Promise<boolean>
  sendInApp(user: DeliveryUser, message: DeliveryMessage): Promise<boolean>
}

