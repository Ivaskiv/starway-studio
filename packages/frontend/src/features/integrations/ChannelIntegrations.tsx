// packages/frontend/src/features/integrations/ChannelIntegrations.tsx
import { useState } from 'react'
import { Eye, EyeOff, Zap, Settings, MessageCircle, Mail, CreditCard, Globe } from 'lucide-react'
import { Button, Input, Select } from '../../ui'
import toast from 'react-hot-toast'
import type { Integration, ChannelConfig } from './integrationsTypes'
import { useUpdateWebhookMutation } from '@/services/integrations.api'

// Константа всіх соціальних/комунікаційних платформ
export const SOCIAL_PLATFORMS: Integration['type'][] = [
  'telegram', 'email', 'payment', 'landing', 'webhook'
]

export default function ChannelIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: '1', name: 'Telegram Bot', type: 'telegram', status: 'disconnected', config: { botToken: '', webhookUrl: '' } },
    { id: '2', name: 'Email (SendPulse)', type: 'email', status: 'disconnected', config: { apiKey: '', from: '' } },
    { id: '3', name: 'WayForPay', type: 'payment', status: 'disconnected', config: { merchantAccount: '', secretKey: '' } },
    { id: '4', name: 'Landing Page', type: 'landing', status: 'disconnected', config: { url: '', type: 'miniapp' } },
    { id: '5', name: 'Webhook', type: 'webhook', status: 'disconnected', config: { url: '', events: '' } },
  ])

  const [selectedIntegration, setSelected] = useState<Integration | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)

  const [updateWebhookMutation] = useUpdateWebhookMutation()

  // Конфігурація полів для кожного типу інтеграції
  const channelConfig: Record<Integration['type'], ChannelConfig> = {
    telegram: {
      icon: MessageCircle,
      color: 'cyan',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...' },
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://your-domain.com/webhook' }
      ]
    },
    email: {
      icon: Mail,
      color: 'purple',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk_...' },
        { key: 'from', label: 'From Email', type: 'email', placeholder: 'nadya@starway.com' }
      ]
    },
    payment: {
      icon: CreditCard,
      color: 'green',
      fields: [
        { key: 'merchantAccount', label: 'Merchant Account', type: 'text', placeholder: 'merchant_123' },
        { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'secret_...' }
      ]
    },
    landing: {
      icon: Globe,
      color: 'blue',
      fields: [
        { key: 'url', label: 'URL', type: 'url', placeholder: 'https://tilda.cc/yourpage' },
        { key: 'type', label: 'Type', type: 'select', options: [
          { value: 'miniapp', label: 'MiniApp (React)' },
          { value: 'tilda', label: 'Tilda' },
          { value: 'external', label: 'External' },
        ]}
      ]
    },
    webhook: {
      icon: Zap,
      color: 'blue',
      fields: [
        { key: 'url', label: 'URL Webhook', type: 'url', placeholder: 'https://your-domain.com/webhook' },
        { key: 'events', label: 'Події (через кому)', type: 'text', placeholder: 'signup, purchase, progress' }
      ]
    }
  }

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    if (selectedIntegration?.id === id) setSelected(prev => prev ? { ...prev, ...updates } : null)
  }

  const testIntegration = (integration: Integration) => {
    toast(`Тестування інтеграції: ${integration.name}`)
    console.log('Test Integration:', integration)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Інтеграції каналів комунікації</h3>
        <p className="text-gray-400 text-sm">Підключи канали для автоматизації</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(integration => {
          const config = channelConfig[integration.type]
          const Icon = config.icon
          const isConnected = integration.status === 'connected'

          return (
            <div
              key={integration.id}
              className={`bg-gray-900 border rounded-2xl p-6 transition-all ${
                isConnected ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${config.color}-500/10`}>
                  <Icon className={`text-${config.color}-400`} size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">{integration.name}</h4>
                  <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                    {isConnected ? 'Підключено' : 'Відключено'}
                  </span>
                </div>
                {isConnected && (
                  <Button color="red" size="sm" onClick={() => updateIntegration(integration.id, { status: 'disconnected' })}>
                    Від'єднати
                  </Button>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="flex-1" onClick={() => setSelected(integration)}>
                  <Settings size={16} className="mr-2" />
                  {isConnected ? 'Налаштування' : 'Підключити'}
                </Button>
                {isConnected && (
                  <Button className="flex-1" onClick={() => testIntegration(integration)}>
                    <Zap size={16} className="mr-2" />
                    Тест
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">{selectedIntegration.name}</h4>
              <Button size="sm" onClick={() => setSelected(null)}>✕</Button>
            </div>

            {channelConfig[selectedIntegration.type].fields.map(field => (
              <div key={field.key} className="relative">
                {field.type === 'select' && field.options ? (
                  <Select
                    label={field.label}
                    options={field.options}
                    value={selectedIntegration.config[field.key] || ''}
                    onChange={e => updateIntegration(selectedIntegration.id, {
                      config: { ...selectedIntegration.config, [field.key]: e.target.value }
                    })}
                  />
                ) : (
                  <Input
                    label={field.label}
                    type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={selectedIntegration.config[field.key] || ''}
                    onChange={e => updateIntegration(selectedIntegration.id, {
                      config: { ...selectedIntegration.config, [field.key]: e.target.value }
                    })}
                  />
                )}
                {field.type === 'password' && (
                  <Button
                    type="button"
                    size="sm"
                    className="absolute top-0 right-0 mt-1 mr-1"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                )}
              </div>
            ))}

            {selectedIntegration.type === 'webhook' && (
              <div className="flex gap-3 mt-4">
                <Button
                  className="flex-1"
                  color="green"
                  onClick={() => {
                    const eventsArray = (selectedIntegration.config.events || '').split(',').map(e => e.trim()).filter(Boolean)
                    updateWebhookMutation({ id: selectedIntegration.id, data: { ...selectedIntegration.config, events: eventsArray } })
                      .unwrap()
                      .then(() => toast.success('Webhook оновлено'))
                      .catch(() => toast.error('Помилка оновлення Webhook'))
                  }}
                >
                  Зберегти
                </Button>
                <Button className="flex-1" onClick={() => setSelected(null)}>Скасувати</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
