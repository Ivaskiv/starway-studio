// packages/frontend/src/features/settings/pages/SettingsPage.tsx
import { TelegramConnectModal } from '@/features/ai-mentor/components/TelegramConnectModal'
import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
// import { useDisconnectSocialMutation, useGetSocialConnectionsQuery } from '@/features/social/types/social.api'
import { SOCIAL_PLATFORMS, SocialProvider } from '@/constants/socialPlatforms'
import { useDisconnectSocialMutation, useGetSocialConnectionsQuery } from '@/services/social.api'
import { GlassCard, Input } from '@/ui'
import { SocialButton } from '@/ui/SocialButton'
import { Bell, Flame, Sparkles, Target, TrendingUp, User as UserIcon } from 'lucide-react'

export default function SettingsPage() {
  const { data: userData } = useGetMeQuery()
  const { data: socialData } = useGetSocialConnectionsQuery()
  const [disconnectSocial] = useDisconnectSocialMutation()

  const user = userData?.user
  const connections = socialData?.connections || []

  const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'Starway_byNadya_Bot'

  // Соцмережа, вибрана для сповіщень
  const [selectedSocial, setSelectedSocial] = useState<SocialProvider | ''>('')
  // Модалка Telegram
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  // Сповіщення
  const [notifications, setNotifications] = useState({
    morning: true,
    evening: true,
    wheel: true,
  })

  // Встановлюємо дефолтну соцмережу для сповіщень
  useEffect(() => {
    const notifConnection = connections.find(c => c.metadata?.is_notifications)
    if (notifConnection) setSelectedSocial(notifConnection.provider)
  }, [connections])

  const handleSelectSocial = (provider: SocialProvider) => {
    setSelectedSocial(provider)
    toast.success(`${provider[0].toUpperCase() + provider.slice(1)} обрано для сповіщень!`)
  }

  const handleDisconnectSocial = async (provider: SocialProvider) => {
    try {
      await disconnectSocial({ provider }).unwrap()
      toast.success(`${provider[0].toUpperCase() + provider.slice(1)} відключено`)
      if (selectedSocial === provider) setSelectedSocial('')
    } catch {
      toast.error('Помилка відключення')
    }
  }

  const getConnection = (platform: SocialProvider) => {
    switch (platform) {
      case 'telegram': return user?.telegram_id ? { provider: platform, username: BOT_USERNAME } : null
      case 'discord': return user?.discord_id ? { provider: platform, username: '' } : null
      case 'instagram': return user?.instagram_id ? { provider: platform, username: '' } : null
      default: return null
    }
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Налаштування</h1>
        <p className="text-white/60 mt-1">Керуй своїм профілем та сповіщеннями</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Профіль */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-purple-400" />
            Профіль
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                          flex items-center justify-center text-white text-2xl font-bold">
              {(user?.first_name?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <p className="text-white font-medium text-lg">{user?.first_name} {user?.last_name}</p>
              <p className="text-white/50">{user?.email}</p>
            </div>
          </div>
        </GlassCard>

        {/* Соцмережі для сповіщень */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Соцмережі
          </h2>
          <div className="space-y-2">
            {SOCIAL_PLATFORMS.map(platform => {
              const connection = getConnection(platform)
              const connected = Boolean(connection)
              return (
                <div key={platform} className="flex items-center gap-3">
                  <Input
                    type="radio"
                    name="notificationsSocial"
                    checked={selectedSocial === platform}
                    onChange={() => handleSelectSocial(platform)}
                    disabled={!connected}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <SocialButton
                    platform={platform}
                    username={platform === 'telegram' ? BOT_USERNAME : undefined}
                    label={connected ? `Відкрити ${platform}` : `Підключити ${platform}`}
                    onClick={platform === 'telegram' && !connected ? () => setShowTelegramModal(true) : undefined}
                    className="flex-1"
                  />
                  {connected && (
                    <button
                      onClick={() => handleDisconnectSocial(platform)}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      Відключити
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Налаштування сповіщень */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Сповіщення
          </h2>
          {['morning','evening','wheel'].map((key) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <p className="text-white capitalize">{key === 'morning' ? 'Ранкові питання' : key === 'evening' ? 'Вечірні питання' : 'Колесо балансу'}</p>
              <Input
                type="checkbox"
                checked={notifications[key as keyof typeof notifications]}
                onChange={() =>
                  setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))
                }
                className="w-5 h-5 accent-purple-500"
              />
            </div>
          ))}
        </GlassCard>
      </div>

      {/* Статистика / Гейміфікація */}
      <div className="grid lg:grid-cols-4 gap-6 mt-4">
        {[
          { label: 'Стрік', value: user?.streak ?? 0, icon: Flame, color: 'red' },
          { label: 'Виконані блоки', value: user?.completed_blocks ?? 0, icon: Target, color: 'green' },
          { label: 'Балів', value: user?.total_points ?? 0, icon: Sparkles, color: 'purple' },
          { label: 'Рівень', value: Math.floor((user?.total_points ?? 0)/500)+1, icon: TrendingUp, color: 'blue' }
        ].map((item) => (
          <GlassCard key={item.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/20 flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 text-${item.color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-xs text-white/50">{item.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Модал Telegram */}
      <TelegramConnectModal
        isOpen={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
      />
    </div>
  )
}
