import { ROUTES } from '@/config/routes';
import { useGenerateTelegramLinkMutation, useGetConnectionsQuery } from '@/features/social/services/social.api';
import { GlassCard } from '@/ui';
import { BellRing, ExternalLink, Globe, Send, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function UserDeliveryChannelsCard() {
  const navigate = useNavigate();
  const { data } = useGetConnectionsQuery();
  const [generateTelegramLink, { isLoading }] = useGenerateTelegramLinkMutation();

  const telegram = (data?.connections || []).find((connection) => connection.provider === 'telegram');
  const isTelegramLinked = Boolean(telegram);

  const handleTelegram = async () => {
    try {
      const result = await generateTelegramLink().unwrap();
      window.open(result.link, '_blank', 'noopener,noreferrer');
      toast.success('Відкрийте бота Telegram і натисніть Start для привʼязки.');
    } catch (error: any) {
      const message = error?.data?.message || error?.data?.error || 'Не вдалося згенерувати Telegram-посилання';
      toast.error(String(message));
    }
  };

  return (
    <GlassCard className="p-6 border-white/10">
      {/* fix code_x: unified card for reminders, miniapp, landing and cross-device learning flow. */}
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <BellRing className="w-5 h-5 text-[var(--color-accent)]" />
        Канали доступу та нагадування
      </h3>
      <p className="text-sm text-white/55 mt-1">
        Проходьте курс з телефону у вебі або через Telegram акаунт/miniapp. Нагадування і прогрес синхронізуються.
      </p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleTelegram}
          disabled={isLoading}
          className="btn justify-between rounded-xl bg-white/10 border-white/20"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Send className="w-4 h-4" />
            {isTelegramLinked ? 'Оновити Telegram звʼязок' : 'Підключити Telegram'}
          </span>
          <ExternalLink className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="btn justify-between rounded-xl bg-white/10 border-white/20"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Smartphone className="w-4 h-4" />
            Відкрити web-кабінет
          </span>
          <ExternalLink className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.AI_FUNNEL_LANDING)}
          className="btn justify-between rounded-xl bg-white/10 border-white/20"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Globe className="w-4 h-4" />
            Відкрити лендінг
          </span>
          <ExternalLink className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.PRODUCTS)}
          className="btn justify-between rounded-xl bg-[color:rgba(var(--accent-rgb),0.66)] border-[color:rgba(var(--accent-rgb),0.9)]"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Smartphone className="w-4 h-4" />
            Продовжити навчання
          </span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-white/60">
          Telegram: {isTelegramLinked ? `підключено (${telegram?.username ? '@' + telegram.username : 'linked'})` : 'не підключено'}
        </p>
      </div>
    </GlassCard>
  );
}
