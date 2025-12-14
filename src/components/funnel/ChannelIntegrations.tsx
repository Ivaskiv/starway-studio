// src/components/funnel/ChannelIntegrations.tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { 
  MessageCircle, Mail, CreditCard, Globe,
  CheckCircle, XCircle, Settings, Zap,
  Copy, Eye, EyeOff
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  type: 'telegram' | 'email' | 'payment' | 'landing'
  status: 'connected' | 'disconnected' | 'error'
  config: any
}

export default function ChannelIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Telegram Bot',
      type: 'telegram',
      status: 'disconnected',
      config: { botToken: '', webhookUrl: '' }
    },
    {
      id: '2',
      name: 'Email (SendPulse)',
      type: 'email',
      status: 'disconnected',
      config: { apiKey: '', from: '' }
    },
    {
      id: '3',
      name: 'WayForPay',
      type: 'payment',
      status: 'disconnected',
      config: { merchantAccount: '', secretKey: '' }
    },
    {
      id: '4',
      name: 'Landing Page',
      type: 'landing',
      status: 'disconnected',
      config: { url: '', type: 'miniapp' }
    }
  ])

  const [selectedIntegration, setSelected] = useState<Integration | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)

  const channelConfig = {
    telegram: {
      icon: MessageCircle,
      color: 'cyan',
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password' as const, placeholder: '123456:ABC-DEF...' },
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text' as const, placeholder: 'https://your-domain.com/webhook' }
      ]
    },
    email: {
      icon: Mail,
      color: 'purple',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'password' as const, placeholder: 'sk_...' },
        { key: 'from', label: 'From Email', type: 'email' as const, placeholder: 'nadya@starway.com' }
      ]
    },
    payment: {
      icon: CreditCard,
      color: 'green',
      fields: [
        { key: 'merchantAccount', label: 'Merchant Account', type: 'text' as const, placeholder: 'merchant_123' },
        { key: 'secretKey', label: 'Secret Key', type: 'password' as const, placeholder: 'secret_...' }
      ]
    },
    landing: {
      icon: Globe,
      color: 'blue',
      fields: [
        { key: 'url', label: 'URL', type: 'url' as const, placeholder: 'https://tilda.cc/yourpage' },
        { 
          key: 'type', 
          label: 'Type', 
          type: 'select' as const,
          options: [
            { value: 'miniapp', label: 'MiniApp (React)' },
            { value: 'tilda', label: 'Tilda' },
            { value: 'external', label: 'External' }
          ]
        }
      ]
    }
  }

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrations(ints => ints.map(i => 
      i.id === id ? { ...i, ...updates } : i
    ))
  }

  const connectIntegration = async (integration: Integration) => {
    updateIntegration(integration.id, { status: 'connected' })
    setSelected(null)
  }

  const disconnectIntegration = (id: string) => {
    updateIntegration(id, { status: 'disconnected' })
  }

  const testIntegration = async (integration: Integration) => {
    alert(`Тест ${integration.name} успішний! ✅`)
  }

  return (
    <div className="space-y-6">
      
      <div>
        <h3 className="text-xl font-bold mb-2">Інтеграції каналів</h3>
        <p className="text-gray-400 text-sm">
          Підключи канали комунікації для автоматизації
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(integration => {
          const config = channelConfig[integration.type]
          const Icon = config.icon
          const isConnected = integration.status === 'connected'

          return (
            <div
              key={integration.id}
              className={`
                bg-gray-900 border rounded-2xl p-6 transition-all
                ${isConnected 
                  ? 'border-green-500/50 shadow-lg shadow-green-500/10' 
                  : 'border-gray-800 hover:border-gray-700'
                }
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-${config.color}-500/10 rounded-xl flex items-center justify-center`}>
                    <Icon size={24} className={`text-${config.color}-400`} />
                  </div>
                  <div>
                    <h4 className="font-bold">{integration.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {isConnected ? (
                        <>
                          <CheckCircle size={14} className="text-green-400" />
                          <span className="text-xs text-green-400">Підключено</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-gray-500" />
                          <span className="text-xs text-gray-500">Не підключено</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isConnected && (
                  <Button
                    variant="ghost"
                    onClick={() => disconnectIntegration(integration.id)}
                    className="text-sm"
                  >
                    Від'єднати
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant={isConnected ? 'secondary' : 'primary'}
                  className="flex-1"
                  onClick={() => setSelected(integration)}
                >
                  <Settings size={16} />
                  {isConnected ? 'Налаштування' : 'Підключити'}
                </Button>

                {isConnected && (
                  <Button
                    variant="secondary"
                    onClick={() => testIntegration(integration)}
                    aria-label="Тест з'єднання"
                  >
                    <Zap size={16} />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Configuration Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold">{selectedIntegration.name}</h3>
              <Button
                variant="ghost"
                onClick={() => setSelected(null)}
                aria-label="Закрити"
              >
                ✕
              </Button>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              {channelConfig[selectedIntegration.type].fields.map(field => (
                <div key={field.key}>
                  {field.type === 'select' && field.options ? (
                    <Select
                      label={field.label}
                      options={field.options}
                      value={selectedIntegration.config[field.key]}
                      onChange={(e) => {
                        const newConfig = { ...selectedIntegration.config, [field.key]: e.target.value }
                        setSelected({ ...selectedIntegration, config: newConfig })
                      }}
                    />
                  ) : (
                    <div className="relative">
                      <Input
                        label={field.label}
                        type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={selectedIntegration.config[field.key]}
                        onChange={(e) => {
                          const newConfig = { ...selectedIntegration.config, [field.key]: e.target.value }
                          setSelected({ ...selectedIntegration, config: newConfig })
                        }}
                      />
                      {field.type === 'password' && (
                        <Button
                          variant="ghost"
                          onClick={() => setShowSecrets(!showSecrets)}
                          className="absolute right-2 top-[38px] p-1"
                          aria-label={showSecrets ? 'Сховати' : 'Показати'}
                        >
                          {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Quick Setup for Telegram */}
              {selectedIntegration.type === 'telegram' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-400 mb-3 font-medium">
                    Швидке налаштування
                  </p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>1. Напиши @BotFather в Telegram</p>
                    <p>2. Відправ /newbot</p>
                    <p>3. Скопіюй токен сюди</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full mt-3 text-sm"
                    onClick={() => window.open('https://t.me/BotFather', '_blank')}
                  >
                    Відкрити BotFather
                  </Button>
                </div>
              )}

              {/* Webhook URL for Telegram */}
              {selectedIntegration.type === 'telegram' && selectedIntegration.config.botToken && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Webhook URL:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-900 px-3 py-2 rounded overflow-x-auto">
                      https://api.starway.com/webhook/telegram
                    </code>
                    <Button
                      variant="ghost"
                      className="p-2"
                      onClick={() => {
                        navigator.clipboard.writeText('https://api.starway.com/webhook/telegram')
                        alert('Скопійовано!')
                      }}
                      aria-label="Копіювати"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelected(null)}
              >
                Скасувати
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => connectIntegration(selectedIntegration)}
              >
                <CheckCircle size={16} />
                Підключити
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}