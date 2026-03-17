export interface ExpertRegistrationPayload {
  email: string
  displayName: string
  timezone?: string
  telegramBotToken?: string | null
  telegramBotName?: string | null
  isActive?: boolean
}
