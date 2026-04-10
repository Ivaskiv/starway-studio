import { Button } from '@/ui'
import { useLazyGetTelegramLinkUrlQuery, useRetryTelegramLinkMutation, type TelegramLinkResponse } from '@/features/auth/services/auth.api'
import { BellRing, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

interface TelegramEnhancementBannerProps {
  botActive: boolean
  linked: boolean
}

export default function TelegramEnhancementBanner({
  botActive,
  linked,
}: TelegramEnhancementBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [getTelegramLink, telegramLinkRequest] = useLazyGetTelegramLinkUrlQuery()
  const [retryTelegramLink, retryState] = useRetryTelegramLinkMutation()

  const isLoading = telegramLinkRequest.isFetching || retryState.isLoading
  const isRetry = linked && !botActive

  const title = useMemo(() => (isRetry ? 'Reconnect Telegram' : 'Connect Telegram'), [isRetry])
  const description = useMemo(
    () => (isRetry
      ? 'Reconnect Telegram to restore reminders, insights, and streak protection.'
      : 'Get reminders, insights, and protect your streak with Telegram.'),
    [isRetry],
  )

  if (dismissed || botActive) {
    return null
  }

  const openTelegramFlow = (result: TelegramLinkResponse) => {
    window.open(result.url, '_blank', 'noopener,noreferrer')
    toast.success(isRetry ? 'Telegram link regenerated' : 'Telegram link ready')
  }

  const handleConnect = async () => {
    try {
      const result = isRetry
        ? await retryTelegramLink().unwrap()
        : await getTelegramLink().unwrap()
      openTelegramFlow(result)
    } catch (error) {
      console.error('[TelegramEnhancementBanner] failed to open telegram link', error)
      toast.error('Не вдалося підготувати Telegram-посилання')
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.08)] px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <BellRing className="h-4 w-4 text-[rgb(var(--accent-rgb))]" />
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              void handleConnect()
            }}
            disabled={isLoading}
            className="bg-[rgb(var(--accent-rgb))] text-white hover:brightness-110"
          >
            <Send className="mr-2 h-4 w-4" />
            {isRetry ? 'Reconnect Telegram' : 'Connect Telegram'}
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            className="border border-white/10 bg-white/5 text-[var(--text-primary)] hover:bg-white/10"
          >
            Continue without
          </Button>
        </div>
      </div>
    </div>
  )
}
