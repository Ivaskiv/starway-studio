import { useGenerateTelegramLinkMutation, useGetConnectionsQuery } from '@/features/social/services/social.api'
import { Button, GlassCard } from '@/ui'
import { BellRing, ExternalLink, Send, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function UserDeliveryChannelsCard() {

  const navigate = useNavigate()

  const { data } = useGetConnectionsQuery()

  const [generateTelegramLink, { isLoading }] =
    useGenerateTelegramLinkMutation()

  const telegram =
    (data?.connections || []).find(c => c.provider === 'telegram')

  const isTelegramLinked = Boolean(telegram)

  const handleTelegram = async () => {
    try {

      const result = await generateTelegramLink().unwrap()

      window.open(result.link, '_blank', 'noopener,noreferrer')

      toast.success('Відкрийте Telegram бота і натисніть Start.')

    } catch (error: any) {

      toast.error(
        error?.data?.message ||
        error?.data?.error ||
        'Не вдалося згенерувати Telegram'
      )
    }
  }

  return (
    <GlassCard className="p-6 border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">

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
            {isTelegramLinked ? 'Оновити Telegram' : 'Підключити Telegram'}
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
            ? `підключено (${telegram?.username ? '@' + telegram.username : 'linked'})`
            : 'не підключено'}
        </p>
      </div>

    </GlassCard>
  )
}
