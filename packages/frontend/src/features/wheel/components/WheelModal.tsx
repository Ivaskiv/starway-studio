// features/wheel/components/WheelModal.tsx

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { WheelForm } from './WheelForm'
import { Button } from '@/ui'

interface WheelModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onComplete?: (assessmentId: string) => void
}

export const WheelModal = ({ isOpen, onClose, userId, onComplete }: WheelModalProps) => {
  const handleComplete = (id: string) => {
    onComplete?.(id)
    onClose()
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Close button */}
            <Button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </Button>
            
            <WheelForm 
              userId={userId} 
              onComplete={handleComplete}
              onCancel={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}