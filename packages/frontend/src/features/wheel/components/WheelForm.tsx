// frontend/src/features/wheel/components/WheelForm.tsx
// features/wheel/components/WheelForm.tsx

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react'
import { WHEEL_CATEGORIES } from '../types/wheel.types'
import { useWheel } from '../hooks/useWheel'
import { WheelChart } from './WheelChart'
import { ScoreSlider } from './ScoreSlider'

interface WheelFormProps {
  userId: string
  onComplete?: (assessmentId: string) => void
  onCancel?: () => void
}

export const WheelForm = ({ userId, onComplete, onCancel }: WheelFormProps) => {
  const {
    currentIndex,
    currentCategory,
    currentScore,
    scores,
    progress,
    isFirstStep,
    isLastStep,
    setScore,
    nextStep,
    prevStep,
    goToStep,
    submit,
    isSubmitting,
  } = useWheel(userId)

  const handleNext = async () => {
    if (isLastStep) {
      const result = await submit()
      if (result) {
        onComplete?.(result.id)
      }
    } else {
      nextStep()
    }
  }

  if (!currentCategory) return null

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${currentCategory.color}20` }}
          >
            {currentCategory.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{currentCategory.nameUk}</h2>
            <p className="text-sm text-white/60">Крок {currentIndex + 1} з {WHEEL_CATEGORIES.length}</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${currentCategory.color}, #8B5CF6)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {WHEEL_CATEGORIES.map((cat, i) => {
          const score = scores.find((s) => s.categoryId === cat.id)?.score ?? 5
          const isActive = i === currentIndex
          const isPast = i < currentIndex
          
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => goToStep(i)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-xl text-sm transition-all
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : isPast 
                    ? 'bg-white/5 text-white/60' 
                    : 'bg-white/5 text-white/40'
                }
              `}
            >
              <span className="mr-1">{cat.icon}</span>
              <span className="font-medium">{score}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Score selection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Як ти оцінюєш цю сферу?
              </h3>
              <p className="text-sm text-white/60">
                1 = Потребує уваги • 10 = Повністю задоволений
              </p>
            </div>
            
            {/* Current score display */}
            <div className="text-center py-4">
              <motion.span
                key={currentScore}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-bold"
                style={{ color: currentCategory.color }}
              >
                {currentScore}
              </motion.span>
            </div>
            
            <ScoreSlider
              value={currentScore}
              onChange={setScore}
              color={currentCategory.color}
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Right: Wheel visualization */}
        <div className="flex items-center justify-center">
          <WheelChart 
            scores={scores} 
            size={280}
            interactive
            onCategoryClick={(id) => {
              const idx = WHEEL_CATEGORIES.findIndex((c) => c.id === id)
              if (idx >= 0) goToStep(idx)
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel || prevStep}
          disabled={isFirstStep && !onCancel}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
            ${isFirstStep && !onCancel
              ? 'opacity-30 cursor-not-allowed' 
              : 'bg-white/5 hover:bg-white/10 text-white'
            }
          `}
        >
          <ChevronLeft className="w-5 h-5" />
          {isFirstStep ? 'Скасувати' : 'Назад'}
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${currentCategory.color}, #8B5CF6)`,
            boxShadow: `0 10px 30px -10px ${currentCategory.color}80`,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Збереження...
            </>
          ) : isLastStep ? (
            <>
              <Sparkles className="w-5 h-5" />
              Завершити
            </>
          ) : (
            <>
              Далі
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}