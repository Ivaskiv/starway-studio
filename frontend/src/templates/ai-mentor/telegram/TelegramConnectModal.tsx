import { useLazyGetTelegramLinkQuery } from '@/services/social.api'
import { Button, Input } from '@/ui'
import { Bell, Check, ChevronRight, Copy, Loader2, MessageCircle, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface TelegramConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

const BENEFITS = [
  { icon: Bell, title: 'Нагадування', description: 'Ранкові та вечірні сесії' },
  { icon: Trophy, title: 'Прогрес', description: 'Щоденна статистика та streak' },
  { icon: MessageCircle, title: 'Чат', description: 'Спілкування з AI-ментором' },
]

export const TelegramConnectModal = ({ isOpen, onClose }: TelegramConnectModalProps) => {
  const [getTelegramLink, { isLoading }] = useLazyGetTelegramLinkQuery()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGetLink = async () => {
    try {
      const result = await getTelegramLink().unwrap()
      setLink(result.link)
      window.open(result.link, '_blank')
    } catch {
      toast.error('Не вдалося отримати посилання')
    }
  }

  const handleCopyLink = () => {
    if (link) {
      navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Посилання скопійовано!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden bg-slate-900/95 border border-white/10">
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/60" />
        </Button>

        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-blue-500/20 to-transparent">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 
                        flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.12.098.153.228.166.331.014.103.03.336.017.519z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Підключи Telegram</h2>
          <p className="text-white/60">Отримуй максимум від AI-ментора</p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-4 space-y-3">
          {BENEFITS.map((benefit, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <benefit.icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{benefit.title}</p>
                <p className="text-white/50 text-sm">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Link display */}
        {link && (
          <div className="mx-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={link}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white text-sm truncate border-0"
              />
              <Button
                onClick={handleCopyLink}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/60" />}
              </Button>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-sm text-center">
            ⚠️ Без Telegram ти не отримаєш нагадування
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 space-y-3">
          <Button
            onClick={handleGetLink}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" />Завантаження...</>
            ) : (
              <><ChevronRight className="w-5 h-5 mr-2" />Підключити Telegram</>
            )}
          </Button>
          
          <Button onClick={onClose} className="w-full py-3 text-white/60 hover:text-white">
            Пізніше
          </Button>
        </div>
      </div>
    </div>
  )
}
