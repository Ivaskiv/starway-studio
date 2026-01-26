// frontend/src/features/integrations/components/TelegramModal.tsx
import { X } from 'lucide-react'
import { Button, GlassCard } from '@/ui'

interface TelegramModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: () => void
}

export function TelegramModal({ isOpen, onClose, onConnect }: TelegramModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <GlassCard 
        blur="xl" 
        className="relative w-full max-w-md animate-in zoom-in duration-300"
      >
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </Button>

        <div className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Підключи Telegram</h2>
            <p className="text-white/60 text-sm">Отримуй максимум від AI-ментора</p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '🔔', title: 'Нагадування', desc: 'Ранкові та вечірні сесії' },
              { icon: '📊', title: 'Прогрес', desc: 'Щоденна статистика та streak' },
              { icon: '💬', title: 'Чат', desc: 'Спілкування з AI-ментором' }
            ].map((item, i) => (
              <div 
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="text-xs text-white/60">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-3">
              <span className="text-amber-500 text-lg">⚠️</span>
              <p className="text-sm text-amber-200/80">
                Без Telegram ти не отримаєш нагадування
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              color="orange"
              size="lg"
              fullWidth
              onClick={onConnect}
            >
              Підключити Telegram
            </Button>
            <Button
              variant="ghost"
              color="white"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Пізніше
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}