// packages/frontend/src/features/ai-mentor/components/TelegramConnectModal.tsx

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Trophy, MessageCircle } from 'lucide-react'
import { Button } from '@/ui'
import { SocialButton } from '@/ui/SocialButton'
import toast from 'react-hot-toast'

interface TelegramConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'StarwayMentorBot'

const BENEFITS = [
  { 
    icon: Bell, 
    title: 'Нагадування', 
    description: 'Ранкові та вечірні сесії',
    color: 'text-blue-400 bg-blue-500/20',
  },
  { 
    icon: Trophy, 
    title: 'Прогрес', 
    description: 'Щоденна статистика та streak',
    color: 'text-green-400 bg-green-500/20',
  },
  { 
    icon: MessageCircle, 
    title: 'Чат', 
    description: 'Спілкування з AI-ментором',
    color: 'text-purple-400 bg-purple-500/20',
  },
]

export const TelegramConnectModal = ({ isOpen, onClose }: TelegramConnectModalProps) => {
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
            className="relative w-full max-w-md rounded-3xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-2xl"
          >
            {/* Close button */}
            <Button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </Button>

            {/* Header */}
            <div className="pt-8 pb-6 px-6 text-center bg-gradient-to-b from-blue-500/20 to-transparent">
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
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl ${benefit.color} flex items-center justify-center`}>
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{benefit.title}</p>
                    <p className="text-white/50 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Warning */}
            <div className="mx-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-sm text-center flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>Без Telegram ти не отримаєш нагадування</span>
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              {/* Використовуємо SocialButton */}
              <SocialButton platform="telegram" username={BOT_USERNAME} />
              
              <Button 
                onClick={onClose} 
                className="w-full py-3 text-white/50 hover:text-white transition-colors rounded-xl"
              >
                Пізніше
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
