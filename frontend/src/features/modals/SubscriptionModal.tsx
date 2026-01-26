// frontend/src/features/modals/SubscriptionModal.tsx
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../ui'
import { BaseModal } from './BaseModal'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // tiny delay щоб Tailwind transition спрацював
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div
        className={`
          relative w-full max-w-lg rounded-3xl
          bg-slate-900 border border-white/10 p-6
          transition-all duration-300
          ${isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-5'}
        `}
      >
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl"
        >
          <X className="w-5 h-5 text-white/70" />
        </Button>

        <h2 className="text-2xl font-bold text-white mb-4">
          Підписка
        </h2>

        <Button
          disabled={loading}
          onClick={() => setLoading(true)}
          className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95"
        >
          {loading ? 'Обробка...' : 'Оформити'}
        </Button>
      </div>
    </BaseModal>
  )
}
