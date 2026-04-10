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
  telegramHtml?: string
  ctaText?: string
  ctaUrl?: string
  ctaMode?: 'web_app' | 'url'
  ctaActions?: Array<{
    text: string
    url: string
    mode?: 'web_app' | 'url' | 'callback'
  }>
}

export interface NotificationDeliveryAdapter {
  sendTelegram(user: DeliveryUser, message: DeliveryMessage): Promise<boolean>
  sendInApp(user: DeliveryUser, message: DeliveryMessage): Promise<boolean>
}
