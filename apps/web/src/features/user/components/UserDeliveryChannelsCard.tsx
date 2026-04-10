import { useLazyGetTelegramLinkUrlQuery, useGetTelegramStatusQuery } from '@/features/auth/services/auth.api'
import { useGetConnectionsQuery } from '@/features/social/services/social.api'
import { Button, GlassCard } from '@/ui'
import { BellRing, ExternalLink, Send, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function UserDeliveryChannelsCard() {

  const navigate = useNavigate()

  const { data } = useGetConnectionsQuery()
  const [triggerTelegramLink, { isFetching: isLoading }] = useLazyGetTelegramLinkUrlQuery()
  const { data: telegramStatus } = useGetTelegramStatusQuery()

  const telegram =
    (data?.connections || []).find(c => c.provider === 'telegram')

  const isTelegramLinked = Boolean(telegramStatus?.linked ?? telegram)
  const isTelegramActive = Boolean(telegramStatus?.botActive ?? isTelegramLinked)

  const handleTelegram = async () => {
    try {
      const result = await triggerTelegramLink().unwrap()
      window.open(result.url, '_blank', 'noopener,noreferrer')
      toast.success(isTelegramActive ? 'Відкрийте Telegram і продовжіть у боті.' : 'Відкрийте Telegram бота і натисніть Start.')

    } catch (error: any) {

      toast.error(
        error?.data?.message ||
        error?.data?.error ||
        'Не вдалося згенерувати Telegram'
      )
    }
  }

  return (
    <GlassCard className="p-6 border-[var(--glass-border)] bg-[var(--glass-bg)]">

      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <BellRing className="w-5 h-5 text-[rgb(var(--accent-rgb))]" />
        Канали доступу
      </h3>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">

        <Button
          onClick={handleTelegram}
          disabled={isLoading}
          className="btn justify-between bg-white/10 border-white/20"
        >
          <span className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {isTelegramLinked ? (isTelegramActive ? 'Відкрити Telegram' : 'Підключити знову') : 'Підключити Telegram'}
          </span>
          <ExternalLink className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => navigate('/dashboard')}
          className="btn justify-between bg-white/10 border-white/20"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Web кабінет
          </span>
          <ExternalLink className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => navigate('/dashboard/products')}
          className="btn justify-between bg-[rgb(var(--accent-rgb))]"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Продовжити навчання
          </span>
          <ExternalLink className="w-4 h-4" />
        </Button>

      </div>

      <div className="mt-4 rounded-xl border border-[var(--glass-border)] bg-white/5 p-3">
        <p className="text-xs text-white/60">
          Telegram:
          {' '}
          {isTelegramLinked
            ? `${isTelegramActive ? 'підключено' : 'потребує оновлення'} (${telegram?.username ? '@' + telegram.username : 'linked'})`
            : 'не підключено'}
        </p>
      </div>

    </GlassCard>
  )
}
