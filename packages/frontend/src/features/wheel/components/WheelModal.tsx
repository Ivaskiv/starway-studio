// packages/frontend/src/features/wheel/components/WheelModal.tsx

import { WheelScore } from '@/features/wheel/types/wheel.types'
import { Button, Progress } from '@/ui'
import { Label } from '@/ui/Label'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Lightbulb, Loader2, Sparkles, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

// Types

interface WheelModalProps {
  isOpen: boolean
  user_id: string
  onClose: () => void
  onComplete?: (scores: WheelScore[]) => void
}

// Сфери життя з детальними питаннями
const LIFE_SPHERES = [
  {
    key: 'health',
    emoji: '❤️',
    title: "Здоров'я та енергія",
    question: `0 = енергія відсутня, 10 = енергія максимальна

Подумай:
• Якість сну ночами?
• Гідрація та харчування достатні?
• Рух у режимі дня?
• Сила та бадьорість присутні?`,
    hint: '💡 Енергія — фундамент усього',
    color: 'from-red-500 to-pink-500',
  },
  {
    key: 'self_growth',
    emoji: '📚',
    title: 'Особистісний розвиток',
    question: `0 = застій, 10 = постійне вдосконалення

Подумай:
• Нові знання та навички набуваються?
• Змінюється спосіб мислення?
• Прогрес видимий?
• Краща версія себе створюється?`,
    hint: '💡 Розвиток — щоденний вибір',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'relationships',
    emoji: '👥',
    title: "Стосунки (сім'я, друзі)",
    question: `0 = ізоляція, 10 = взаємність та близькість

Подумай:
• Контакт з близькими людьми підтримується?
• Якість розмов та спілкування висока?
• Взаєморозуміння присутнє?
• Взаємна підтримка існує?`,
    hint: '💡 Люди — найбільший скарб',
    color: 'from-pink-500 to-rose-500',
  },
  {
    key: 'career',
    emoji: '💼',
    title: "Кар'єра та професія",
    question: `0 = демотивація, 10 = професійне задоволення

Подумай:
• Сенс у повсякденній роботі присутній?
• Відчуття впливу та корисності існує?
• Кар'єра розвивається?
• Результати визнані?`,
    hint: '💡 Робота займає третину життя',
    color: 'from-amber-500 to-orange-500',
  },
  {
    key: 'finance',
    emoji: '💰',
    title: 'Фінанси та достаток',
    question: `0 = фінансовий тиск, 10 = фінансова свобода

Подумай:
• Доходи стабільні та зростають?
• Витрати під контролем?
• Резервний запас сформований?
• Фінансові цілі ясні?`,
    hint: '💡 Гроші — інструмент вибору',
    color: 'from-green-500 to-emerald-500',
  },
  {
    key: 'leisure',
    emoji: '🎨',
    title: 'Дозвілля та відпочинок',
    question: `0 = тільки обов'язки, 10 = радість присутня

Подумай:
• Час на улюблене виділяється?
• Хобі та розслаблення можливі?
• Сміх у рутині присутній?
• Активності заряджають енергією?`,
    hint: '💡 Радість — паливо для душі',
    color: 'from-purple-500 to-violet-500',
  },
  {
    key: 'spirituality',
    emoji: '🧘',
    title: 'Духовність та цінності',
    question: `0 = пустота сенсу, 10 = сенс керує дійсність

Подумай:
• Цінності ясні та визначені?
• Дії збігаються з принципами?
• Сенс у кожному дні?
• Практики розвиваються?`,
    hint: '💡 Сенс надає вагу усьому',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    key: 'housing',
    emoji: '🏠',
    title: 'Побут та оточення',
    question: `0 = хаос, 10 = гармонія та порядок

Подумай:
• Дім як безпечне місце сприймається?
• Оточення натхненням чи тягарем?
• Порядок у речах та думках?
• Простір для розвитку надається?`,
    hint: '💡 Простір — дзеркало внутрішнього',
    color: 'from-teal-500 to-cyan-500',
  },
]

const TOTAL_STEPS = LIFE_SPHERES.length

export const WheelModal = ({ isOpen, onClose, onComplete }: WheelModalProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [scores, setScores] = useState<WheelScore[]>(
    LIFE_SPHERES.map(s => ({ category_id: s.key, score: 5 }))
  )
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currentSphere = LIFE_SPHERES[currentStep]
  const currentScoreObj = scores.find(s => s.category_id === currentSphere?.key)
  const currentScore = currentScoreObj?.score ?? 5
  const currentNotes = currentScoreObj?.notes ?? ''
  
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOTAL_STEPS - 1

  const handleScoreSelect = useCallback((score: number) => {
    setScores(prev => prev.map(s => 
      s.category_id === currentSphere.key ? { ...s, score } : s
    ))
  }, [currentSphere?.key])

  const handleNotesChange = useCallback((notes: string) => {
    setScores(prev => prev.map(s => 
      s.category_id === currentSphere.key ? { ...s, notes } : s
    ))
  }, [currentSphere?.key])

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }, [isLastStep])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }, [isFirstStep])

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      // Тут буде виклик API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock
      setIsCompleted(true)
      toast.success('Колесо балансу збережено! +100 XP 🎯')
      onComplete?.(scores)
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = useCallback(() => {
    setCurrentStep(0)
    setScores(LIFE_SPHERES.map(s => ({ category_id: s.key, score: 5 })))
    setIsCompleted(false)
    onClose()
  }, [onClose])

  // Статистика
  const stats = useMemo(() => {
    const total = scores.reduce((sum, s) => sum + s.score, 0)
    const average = total / TOTAL_STEPS
    return { total, average }
  }, [scores])

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
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-2xl"
          >
            {/* Close button - TOP RIGHT */}
            <Button
              variant="ghost"
              // size="icon"
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20"
            >
              <X className="w-5 h-5 text-white/70" />
            </Button>

            {isCompleted ? (
              // Completion Screen
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 
                           flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
                >
                  <Check className="w-12 h-12 text-white" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Колесо завершено!</h2>
                <p className="text-white/60 mb-6">
                  Ти отримав +100 XP за заповнення колеса балансу
                </p>

                {/* Summary */}
                <div className="bg-white/5 rounded-2xl p-4 mb-6">
                  <p className="text-white/60 text-sm mb-2">Середній бал</p>
                  <p className="text-4xl font-bold text-white">
                    {stats.average.toFixed(1)}
                    <span className="text-lg text-white/40 ml-1">/ 10</span>
                  </p>
                </div>

                {/* Spheres grid */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {scores.map((s, i) => (
                    <div key={s.category_id} className="text-center">
                      <span className="text-2xl">{LIFE_SPHERES[i].emoji}</span>
                      <p className="text-white text-sm font-bold">{s.score}</p>
                    </div>
                  ))}
                </div>

                <Button onClick={handleClose} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl">
                  Закрити
                </Button>
              </div>
            ) : (
              // Question Screen
              <>
                {/* Header */}
                <div className={`p-6 bg-gradient-to-r ${currentSphere.color} bg-opacity-20`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/60 text-sm">
                      Крок {currentStep + 1} з {TOTAL_STEPS}
                    </span>
                    <span className="text-4xl">{currentSphere.emoji}</span>
                  </div>
                  <Progress value={progress} color="purple" size="sm" />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {currentSphere.title}
                  </h3>

                  {/* Question */}
                  <div className="bg-white/5 rounded-2xl p-4 mb-6">
                    <p className="text-white/80 whitespace-pre-line text-sm leading-relaxed">
                      {currentSphere.question}
                    </p>
                  </div>

                  {/* Hint */}
                  <div className="flex items-start gap-2 mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-400 text-sm">{currentSphere.hint}</p>
                  </div>

                  {/* Score Selection */}
                  <div className="mb-6">
                    <Label className="text-white/60 text-sm mb-3 block">Оціни від 0 до 10:</Label>
                    <div className="grid grid-cols-11 gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <Button
                          key={score}
                          variant="ghost"
                          onClick={() => handleScoreSelect(score)}
                          className={`aspect-square rounded-xl font-bold text-sm transition-all p-0 ${
                            currentScore === score
                              ? `bg-gradient-to-r ${currentSphere.color} text-white shadow-lg scale-110`
                              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          {score}
                        </Button>
                      ))}
                    </div>
                    <p className="text-center mt-2 text-white/40 text-sm">
                      Обрано: <span className="text-white font-bold">{currentScore}/10</span>
                    </p>
                  </div>

                  {/* Note Input */}
                  <div>
                    <Label className="text-white/60 text-sm mb-2 block">
                      📝 Нотатка (що покращити?):
                    </Label>
                    <textarea
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Наприклад: збільшити час для друзів, планувати зустрічі..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                               text-white placeholder-white/30 resize-none h-20
                               focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={isFirstStep}
                    className="text-white/60 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Назад
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={isSaving}
                    className={`px-6 py-2.5 rounded-xl font-medium transition-all bg-gradient-to-r ${currentSphere.color} text-white shadow-lg`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isLastStep ? (
                      <>
                        <Sparkles className="w-5 h-5 mr-1" />
                        Завершити
                      </>
                    ) : (
                      <>
                        Далі
                        <ChevronRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default WheelModal