// packages/frontend/src/features/settings/pages/SettingsPage.tsx

import {
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  getSocialPlatformMetadata,
} from '@/constants/socialPlatforms';
import { useGetMeQuery } from '@/features/auth/services/auth.api';
import {
  useDisconnectSocialMutation,
  useGetSocialConnectionsQuery,
} from '@/services/social.api';
import SocialConnectModal from '@/templates/ai-mentor/components/SocialConnectModal';
import { Button } from '@/ui';
import { GlassCard } from '@/ui/GlassCard';
import Icon from '@/ui/Icon';
import { motion } from 'framer-motion';
import {
  Award,
  Bell,
  Check,
  Crown,
  Flame,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { data: userData } = useGetMeQuery();
  const { data: socialData } = useGetSocialConnectionsQuery();
  const [disconnectSocial] = useDisconnectSocialMutation();

  const user = userData?.user;
  const connections = socialData?.connections || [];

  // States
  const [selectedSocial, setSelectedSocial] = useState<SocialPlatform | ''>('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [notifications, setNotifications] = useState({
    morning: true,
    evening: true,
    wheel: true,
  });

  // Встановлюємо дефолтну соцмережу для сповіщень
  useEffect(() => {
    const notifConnection = connections.find((c) => c.metadata?.is_notifications);
    if (notifConnection) setSelectedSocial(notifConnection.provider as SocialPlatform);
  }, [connections]);

  // Handlers
  const handleSelectSocial = (provider: SocialPlatform) => {
    setSelectedSocial(provider);
    toast.success(`${getSocialPlatformMetadata(provider).name} обрано для сповіщень!`);
  };

  const handleDisconnectSocial = async (provider: SocialPlatform) => {
    try {
      await disconnectSocial({ provider }).unwrap();
      toast.success(`${getSocialPlatformMetadata(provider).name} відключено`);
      if (selectedSocial === provider) setSelectedSocial('');
    } catch {
      toast.error('Помилка відключення');
    }
  };

  const isConnected = (platform: SocialPlatform): boolean => {
    return connections.some((c) => c.provider === platform);
  };

  const getConnectedPlatforms = (): SocialPlatform[] => {
    return connections
      .map((c) => c.provider)
      .filter((p): p is SocialPlatform => SOCIAL_PLATFORMS.includes(p as SocialPlatform));
  };

  // Gamification
  const level = Math.floor((user?.total_points ?? 0) / 500) + 1;
  const pointsToNextLevel = level * 500 - (user?.total_points ?? 0);
  const levelProgress = (((user?.total_points ?? 0) % 500) / 500) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 px-4 md:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-purple-400" />
            Налаштування
          </h1>
          <p className="text-white/60">Керуй своїм профілем, сповіщеннями та прогресом</p>
        </div>

        {/* Profile & Level */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Профіль */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />

              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-purple-400" />
                  Профіль
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/30">
                    {(user?.first_name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-xl">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-white/60 text-sm">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white/80">Рівень {level}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Прогрес рівня */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 pointer-events-none" />

              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Прогрес
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-sm">Рівень {level}</span>
                      <span className="text-white/80 text-sm">Рівень {level + 1}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-white/60 mt-2 text-center">
                      Ще {pointsToNextLevel} балів до наступного рівня
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                        <Flame className="w-6 h-6 text-red-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{user?.streak ?? 0}</p>
                      <p className="text-xs text-white/60">Стрік</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                        <Target className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{user?.completed_blocks ?? 0}</p>
                      <p className="text-xs text-white/60">Блоків</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{user?.total_points ?? 0}</p>
                      <p className="text-xs text-white/60">Балів</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Social Networks & Notifications */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Соцмережі */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Соцмережі
              </h2>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const metadata = getSocialPlatformMetadata(platform);
                  const connected = isConnected(platform);

                  return (
                    <motion.div
                      key={platform}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        relative rounded-2xl p-4 transition-all
                        ${
                          connected
                            ? 'bg-white/10 backdrop-blur-md border-2 border-white/20'
                            : 'bg-white/5 backdrop-blur-md border-2 border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {/* Radio */}
                        <button
                          onClick={() => connected && handleSelectSocial(platform)}
                          disabled={!connected}
                          className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                            ${
                              selectedSocial === platform
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-white/30 hover:border-white/50'
                            }
                            ${!connected && 'opacity-30 cursor-not-allowed'}
                          `}
                        >
                          {selectedSocial === platform && <Check className="w-4 h-4 text-white" />}
                        </button>

                        {/* Platform Info */}
                        <button
                          onClick={() => !connected && setShowConnectModal(true)}
                          className="flex-1 flex items-center gap-3"
                        >
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${metadata.gradient} shadow-lg`}
                          >
                            <Icon name={metadata.icon} size={24} className="text-white" />
                          </div>

                          <div className="flex-1 text-left">
                            <div className="font-medium text-white flex items-center gap-2">
                              {metadata.name}
                              {connected && <Check className="w-4 h-4 text-green-400" />}
                            </div>
                            <div className="text-xs text-white/60">
                              {connected ? 'Підключено' : 'Натисніть щоб підключити'}
                            </div>
                          </div>
                        </button>

                        {/* Disconnect Button */}
                        {connected && (
                          <button
                            onClick={() => handleDisconnectSocial(platform)}
                            className="px-3 py-1 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Відключити
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Налаштування сповіщень */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Сповіщення
              </h2>
              <div className="space-y-3">
                {[
                  { key: 'morning', label: 'Ранкові питання', desc: 'Щоденні сповіщення о 9:00' },
                  { key: 'evening', label: 'Вечірні питання', desc: 'Щоденні сповіщення о 21:00' },
                  { key: 'wheel', label: 'Колесо балансу', desc: 'Щотижневі сповіщення' },
                ].map(({ key, label, desc }) => (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 backdrop-blur-md border-2 border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{label}</p>
                      <p className="text-xs text-white/50">{desc}</p>
                    </div>
                    <Button
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof notifications],
                        }))
                      }
                      className={`
                        relative w-12 h-6 rounded-full transition-all
                        ${notifications[key as keyof typeof notifications] ? 'bg-purple-500' : 'bg-white/20'}
                      `}
                    >
                      <motion.div
                        animate={{
                          x: notifications[key as keyof typeof notifications] ? 24 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-lg"
                      />
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* Info */}
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">💡 Сповіщення надходять через обрану соцмережу</p>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Модал підключення */}
        <SocialConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          connectedPlatforms={getConnectedPlatforms()}
          onConnect={async (platform, value) => {
            // TODO: Implement connection logic
            console.log('Connect:', platform, value);
            toast.success(`Підключення ${getSocialPlatformMetadata(platform).name}...`);
          }}
        />
      </div>
    </div>
  );
}