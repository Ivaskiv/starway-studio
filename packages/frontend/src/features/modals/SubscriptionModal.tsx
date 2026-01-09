// /packages/frontend/src/features/modals/SubscriptionModal.tsx

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Check, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/ui'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  highlightedPlan?: 'monthly' | 'yearly'
}

const QUICK_PLANS = [
  {
    id: 'monthly',
    name: 'Місячна',
    price: 299,
    period: 'міс',
    features: ['AI Ментор', 'Всі курси', 'Telegram бот'],
  },
  {
    id: 'yearly',
    name: 'Річна',
    price: 199,
    period: 'міс',
    originalPrice: 299,
    badge: '-33%',
    features: ['Все з місячної', 'Пріоритетна підтримка', 'Ранній доступ'],
  },
]

export const SubscriptionModal = ({ isOpen, onClose, highlightedPlan = 'yearly' }: SubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState(highlightedPlan)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubscribe = async () => {
    setIsProcessing(true)
    // TODO: WayForPay integration
    console.log('Subscribe to:', selectedPlan)
    setTimeout(() => {
      setIsProcessing(false)
      onClose()
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Close */}
            <Button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white/60" />
            </Button>

            {/* Header */}
            <div className="p-6 text-center bg-gradient-to-b from-purple-500/20 to-transparent">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                            flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Розблокуй доступ</h2>
              <p className="text-white/60">Отримай повний доступ до всіх можливостей</p>
            </div>

            {/* Plans */}
            <div className="px-6 py-4 space-y-3">
              {QUICK_PLANS.map((plan) => (
                <Button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedPlan === plan.id
                      ? 'bg-purple-500/20 border-2 border-purple-500'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === plan.id ? 'border-purple-500 bg-purple-500' : 'border-white/30'
                      }`}>
                        {selectedPlan === plan.id && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{plan.name}</span>
                          {plan.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {plan.originalPrice && (
                            <span className="text-white/40 line-through text-sm">₴{plan.originalPrice}</span>
                          )}
                          <span className="text-white/60 text-sm">₴{plan.price}/{plan.period}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.features.map((f, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              <Button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl"
              >
                {isProcessing ? (
                  'Обробка...'
                ) : (
                  <>
                    Оформити підписку
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              
              <p className="text-center text-white/40 text-xs">
                Безпечна оплата через WayForPay • Скасування в будь-який момент
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}