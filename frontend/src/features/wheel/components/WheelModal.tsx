// frontend/src/features/wheel/components/WheelModal.tsx
import { X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv, MotionButton } from '@/ui/Motion'
import { Button } from '@/ui'

interface WheelModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function WheelModal({ isOpen, onClose, onComplete }: WheelModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            {/* Close Button */}
            <Button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </Button>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/25">
                  🎯
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Колесо балансу</h2>
                <p className="text-white/60 text-sm">Оціни свій стан у 8 сферах життя</p>
              </div>

              {/* Categories */}
              <div className="grid gap-3">
                {[
                  { emoji: '💪', title: 'Здоров\'я', desc: 'Фізичний стан' },
                  { emoji: '💰', title: 'Фінанси', desc: 'Матеріальна стабільність' },
                  { emoji: '❤️', title: 'Стосунки', desc: 'Близькі люди' },
                  { emoji: '🎯', title: 'Кар\'єра', desc: 'Професійний розвиток' }
                ].map((cat, i) => (
                  <MotionDiv
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                      {cat.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{cat.title}</div>
                      <div className="text-xs text-white/60">{cat.desc}</div>
                    </div>
                  </MotionDiv>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <MotionButton
                  type="button"
                  onClick={onComplete}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                >
                  Почати оцінку
                </MotionButton>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-6 py-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  Пізніше
                </button>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  )
}