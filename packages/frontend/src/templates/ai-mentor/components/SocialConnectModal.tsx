// packages/frontend/src/features/ai-mentor/components/SocialConnectModal.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import Icon from '@/ui/Icon';
import {
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  getSocialPlatformMetadata,
} from '@/constants/socialPlatforms';

// ============ VALIDATION ============

interface ValidationRule {
  placeholder: string;
  instruction: string;
  validatePattern?: RegExp;
  formatValue?: (value: string) => string;
}

const VALIDATION_RULES: Record<SocialPlatform, ValidationRule> = {
  telegram: {
    placeholder: '@username або номер телефону',
    instruction: 'Відкрийте Telegram і знайдіть бот @YourMentorBot',
    validatePattern: /^(@[\w]{5,}|[\d+]{10,})$/,
    formatValue: (v: string) => (v.startsWith('@') ? v : `+${v.replace(/\D/g, '')}`),
  },
  {% comment %} viber: {
    placeholder: 'Номер телефону',
    instruction: 'Відкрийте Viber і знайдіть бот YourMentor',
    validatePattern: /^[\d+]{10,}$/,
    formatValue: (v: string) => `+${v.replace(/\D/g, '')}`,
  }, {% endcomment %}
  whatsapp: {
    placeholder: 'Номер телефону',
    instruction: 'Відкрийте WhatsApp і додайте +380XXXXXXXXX',
    validatePattern: /^[\d+]{10,}$/,
    formatValue: (v: string) => `+${v.replace(/\D/g, '')}`,
  },
  instagram: {
    placeholder: '@username',
    instruction: 'Напишіть нам Direct Message в Instagram',
    validatePattern: /^@[\w.]{1,30}$/,
  },
  facebook: {
    placeholder: 'Facebook ID або посилання',
    instruction: 'Знайдіть нашу сторінку YourMentor і напишіть у Messenger',
  },
};

// ============ PROPS ============

interface SocialConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (platform: SocialPlatform, value: string) => Promise<void>;
  connectedPlatforms?: SocialPlatform[];
}

// ============ COMPONENT ============

export const SocialConnectModal = ({
  isOpen,
  onClose,
  onConnect,
  connectedPlatforms = [],
}: SocialConnectModalProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const metadata = selectedPlatform ? getSocialPlatformMetadata(selectedPlatform) : null;
  const validation = selectedPlatform ? VALIDATION_RULES[selectedPlatform] : null;

  const handleConnect = async () => {
    if (!selectedPlatform || !metadata || !validation || !inputValue) return;

    if (validation.validatePattern && !validation.validatePattern.test(inputValue)) {
      setError(`Невірний формат для ${metadata.name}`);
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const formatted = validation.formatValue ? validation.formatValue(inputValue) : inputValue;
      await onConnect?.(selectedPlatform, formatted);
      setSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка підключення');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setSelectedPlatform(null);
    setInputValue('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-2xl border border-white/10"
        >
          {/* Close button */}
          <Button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Icon name="X" size={20} className="text-white/60" />
          </Button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {selectedPlatform ? 'Підключення' : 'Оберіть платформу'}
            </h2>
            <p className="text-sm text-white/60">
              {selectedPlatform
                ? 'Введіть ваші дані для підключення'
                : 'Оберіть соціальну мережу для щоденного спілкування'}
            </p>
          </div>

          {/* Platform selection */}
          {!selectedPlatform && (
            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const meta = getSocialPlatformMetadata(platform);
                const isConnected = connectedPlatforms.includes(platform);

                return (
                  <motion.button
                    key={platform}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPlatform(platform)}
                    disabled={isConnected}
                    className={`
                      w-full p-4 rounded-2xl flex items-center gap-4 transition-all
                      ${
                        isConnected
                          ? 'bg-white/5 opacity-50 cursor-not-allowed'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${meta.gradient} shadow-lg`}
                    >
                      <Icon name={meta.icon} size={24} className="text-white" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {meta.name}
                        {isConnected && <Icon name="Check" size={16} className="text-green-400" />}
                      </div>
                      <div className="text-xs text-white/60">
                        {isConnected ? 'Вже підключено' : 'Натисніть щоб підключити'}
                      </div>
                    </div>

                    <span className="text-white/30 text-xl">→</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Connection form */}
          {selectedPlatform && metadata && validation && (
            <div className="space-y-4">
              {/* Platform header */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${metadata.gradient}`}
                >
                  <Icon name={metadata.icon} size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{metadata.name}</div>
                  <div className="text-xs text-white/60">{validation.instruction}</div>
                </div>
              </div>

              {/* Input */}
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError('');
                }}
                placeholder={validation.placeholder}
                disabled={isConnecting || success}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30"
                autoFocus
              />

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Success */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3"
                >
                  <Icon name="Check" size={20} className="text-green-400" />
                  <span className="text-green-300 font-medium">Успішно підключено!</span>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setSelectedPlatform(null)}
                  disabled={isConnecting || success}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                >
                  Назад
                </Button>

                <Button
                  onClick={handleConnect}
                  disabled={!inputValue || isConnecting || success}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${metadata.gradient} disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isConnecting ? (
                    <>
                      <Icon name="Loader2" size={20} className="animate-spin" />
                      Підключення...
                    </>
                  ) : success ? (
                    <>
                      <Icon name="Check" size={20} />
                      Підключено
                    </>
                  ) : (
                    'Підключити'
                  )}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SocialConnectModal;