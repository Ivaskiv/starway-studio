import type { MotionProps } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { ComponentPropsWithoutRef, ComponentType } from 'react'

import BottomNavBar from '@/features/dashboard/components/BottomNavBar'

import QuestionCard, { type SessionQuestion } from './QuestionCard'
import SessionHeader from './SessionHeader'

type MotionDivProps = ComponentPropsWithoutRef<'div'> & MotionProps
const MotionDiv = motion.div as ComponentType<MotionDivProps>

interface SessionViewProps {
  session: 'morning' | 'evening'
  dayNumber: number
  recoveryLabel?: string | null
  current: number
  total: number
  progress: number
  question: SessionQuestion
  answer: string
  isLast: boolean
  isSubmitting: boolean
  embedded?: boolean
  errorMessage?: string | null
  loadingMessage?: string | null
  onAnswerChange: (value: string) => void
  onAnswerBlur?: () => void
  onNext: () => void
  onBack: () => void
}

export function SessionView({
  session,
  dayNumber,
  recoveryLabel,
  current,
  total,
  progress,
  question,
  answer,
  isLast,
  isSubmitting,
  embedded = false,
  errorMessage,
  loadingMessage,
  onAnswerChange,
  onAnswerBlur,
  onNext,
  onBack,
}: SessionViewProps) {
  const canProceed = answer.trim().length > 0

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto max-w-3xl space-y-3 p-3.5'}>
      <SessionHeader
        session={session}
        dayNumber={dayNumber}
        recoveryLabel={recoveryLabel}
        current={current}
        total={total}
        progress={progress}
      />

      <AnimatePresence mode="wait">
        <MotionDiv
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <QuestionCard
            question={question}
            value={answer}
            onChange={onAnswerChange}
            onBlur={onAnswerBlur}
            onSubmit={onNext}
          />
          {errorMessage ? (
            <div className="mt-3 glass-card px-4 py-3">
              <p className="text-xs font-medium text-[rgb(248,113,113)]">
                {errorMessage}
              </p>
            </div>
          ) : null}
          {isSubmitting && loadingMessage ? (
            <div className="mt-3 glass-card px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {loadingMessage}
              </p>
            </div>
          ) : null}
        </MotionDiv>
      </AnimatePresence>

      <BottomNavBar
        backLabel={current > 1 ? 'Попереднє' : 'Щоденник'}
        centerText={`Крок ${current} з ${total}`}
        nextLabel={
          isSubmitting
            ? (loadingMessage ?? 'Зберігаємо...')
            : isLast
              ? session === 'morning'
                ? 'Зберегти і отримати завдання'
                : 'Завершити вечірню сесію'
              : 'Далі'
        }
        nextDisabled={!canProceed || isSubmitting}
        onNext={onNext}
        onBack={current > 1 ? onBack : undefined}
        backHref={current > 1 ? undefined : '/dashboard/journal'}
      />
    </div>
  )
}

export type { SessionQuestion }

export default SessionView
