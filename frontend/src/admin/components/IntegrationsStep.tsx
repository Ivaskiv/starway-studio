// frontend/src/features/admin/components/IntegrationsStep.tsx

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Icon } from '@/ui';
import { Label } from '@/ui/Label';
import { SocialPlatform } from '@/shared/constants/socialPlatforms.constants';

interface IntegrationsStepProps {
  data: any;
  onChange: (data: any) => void;
}

export const IntegrationsStep: React.FC<IntegrationsStepProps> = ({ data, onChange }) => {
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const updateIntegration = (platform: SocialPlatform, field: string, value: any) => {
    onChange({
      ...data,
      integrations: {
        ...data.integrations,
        [platform]: {
          ...data.integrations[platform],
          [field]: value
        }
      }
    });
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `https://starway.studio/webhooks/telegram/${data.branding.name?.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
              <Icon name="telegram" className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Telegram</h3>
              <p className="text-sm text-gray-400">Підключіть Telegram бота</p>
            </div>
          </div>
          <Label className="relative inline-flex items-center cursor-pointer">
            <Input
              type="checkbox"
              checked={data.integrations.telegram.enabled}
              onChange={(e) => updateIntegration('telegram', 'enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </Label>
        </div>

        {data.integrations.telegram.enabled && (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
            {/* Bot Token */}
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Bot Token *
              </Label>
              <Input
                value={data.integrations.telegram.bot_token || ''}
                onChange={(e) => updateIntegration('telegram', 'bot_token', e.target.value)}
                placeholder="1234567890:AAHdqTcvbXYZ..."
                type="password"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Отримайте токен від @BotFather
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Webhook URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={`https://starway.studio/webhooks/telegram/${data.branding.name?.toLowerCase().replace(/\s+/g, '-') || 'your-product'}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyWebhookUrl}
                >
                  {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Встановіть цей URL як webhook в Telegram
              </p>
            </div>

            {/* Guide */}
            <Button
              onClick={() => setShowTelegramGuide(!showTelegramGuide)}
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {showTelegramGuide ? 'Сховати' : 'Як створити Telegram бота?'}
            </Button>

            {showTelegramGuide && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-gray-300 space-y-2">
                <p className="font-semibold text-white">Покрокова інструкція:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Відкрийте Telegram і знайдіть @BotFather</li>
                  <li>Відправте команду /newbot</li>
                  <li>Введіть назву бота (наприклад: Сила свідомості)</li>
                  <li>Введіть username (наприклад: syla_svidomosti_bot)</li>
                  <li>Скопіюйте отриманий токен і вставте вище</li>
                  <li>Встановіть webhook командою:
                    <code className="block mt-1 p-2 bg-black/30 rounded text-xs">
                      /setwebhook https://starway.studio/webhooks/telegram/...
                    </code>
                  </li>
                </ol>
                <a
                  href="https://core.telegram.org/bots/tutorial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-2"
                >
                  Детальна документація
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Viber */}
      {/* <GlassCard className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg">
              <Icon name="viber" className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Viber</h3>
              <p className="text-sm text-gray-400">Підключіть Viber бота</p>
            </div>
          </div>
          <Label className="relative inline-flex items-center cursor-pointer">
            <Input
              type="checkbox"
              checked={data.integrations.viber.enabled}
              onChange={(e) => updateIntegration('viber', 'enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-purple-600 peer-focus:ring-4 peer-focus:ring-purple-800 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </Label>
        </div>

        {data.integrations.viber.enabled && (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Auth Token *
              </Label>
              <Input
                value={data.integrations.viber.auth_token || ''}
                onChange={(e) => updateIntegration('viber', 'auth_token', e.target.value)}
                placeholder="Viber auth token"
                type="password"
                className="w-full"
              />
            </div>
          </div>
        )}
      </GlassCard>
 */}
      {/* WhatsApp */}
      {/* <GlassCard className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
              <Icon name="whatsapp" className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">WhatsApp</h3>
              <p className="text-sm text-gray-400">Підключіть WhatsApp Business API</p>
            </div>
          </div>
          <Label className="relative inline-flex items-center cursor-pointer">
            <Input
              type="checkbox"
              checked={data.integrations.whatsapp.enabled}
              onChange={(e) => updateIntegration('whatsapp', 'enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 peer-focus:ring-4 peer-focus:ring-green-800 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </Label>
        </div>

        {data.integrations.whatsapp.enabled && (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number ID *
              </Label>
              <Input
                value={data.integrations.whatsapp.phone_number_id || ''}
                onChange={(e) => updateIntegration('whatsapp', 'phone_number_id', e.target.value)}
                placeholder="Your WhatsApp phone number ID"
                className="w-full"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Access Token *
              </Label>
              <Input
                value={data.integrations.whatsapp.access_token || ''}
                onChange={(e) => updateIntegration('whatsapp', 'access_token', e.target.value)}
                placeholder="WhatsApp Business API token"
                type="password"
                className="w-full"
              />
            </div>
          </div>
        )}
      </GlassCard> */}

      {/* Info */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-sm text-yellow-200">
          💡 <strong>Порада:</strong> Підключіть хоча б одну інтеграцію для комунікації з користувачами. 
          Telegram найпопулярніший в Україні.
        </p>
      </div>
    </div>
  );
};