import { ArrowLeft, ArrowRight, Check, Circle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/config/routes'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { dashboardDesignSystem, stepIconClass, stepLabelClass } from '@/styles/design-system'
import { Card, Tabs } from '@/ui'

type GoalsTab = 'today' | 'month' | 'year'

type StepState = 'done' | 'active' | 'locked'

type StepItem = {
  id: string
  label: string
  state: StepState
}

type GoalInputItemProps = {
  index: number
  value: string
  placeholder: string
  onChange: (value: string) => void
}

type GoalsTabsProps = {
  activeTab: GoalsTab
  onChange: (tab: GoalsTab) => void
}

type TabTodayProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
}

type TabMonthProps = {
  values: string[]
  onChange: (index: number, value: string) => void
  onSave: () => void
}

type TabYearProps = {
  values: string[]
  onChange: (index: number, value: string) => void
  onSaveAndContinue: () => void
}

type BottomNavigationProps = {
  onBack: () => void
  onNext: () => void
}

const TODAY_COPY = {
  label: 'МІКРОЗАВДАННЯ · ВІДНОСИНИ',
  text: 'Написати одному важливому контакту — просто "як ти?" Без очікувань.',
}

const STEP_ITEMS: StepItem[] = [
  { id: 'wheel', label: 'Колесо', state: 'done' },
  { id: 'goals', label: 'Цілі', state: 'active' },
  { id: 'webmap', label: 'Web Map', state: 'locked' },
  { id: 'cycle', label: 'Цикл', state: 'locked' },
]

const TAB_LABELS: Record<GoalsTab, string> = {
  today: 'Сьогодні',
  month: 'Місяць',
  year: 'Рік',
}

function StepHeader() {
  return (
    <section className={dashboardDesignSystem.spacing.stackLg}>
      <div className={cn('flex items-center', dashboardDesignSystem.spacing.inlineMd)}>
        <div className={dashboardDesignSystem.goals.stepBadge}>
          2
        </div>
        <div>
          <p className={dashboardDesignSystem.typography.headingLg}>Цілі</p>
        </div>
      </div>

      <div className="grid grid-cols-4 items-start gap-4 sm:gap-8">
        {STEP_ITEMS.map((step, index) => (
          <div key={step.id} className="relative flex flex-col items-center text-center">
            {index < STEP_ITEMS.length - 1 ? (
              <span className="absolute left-[calc(50%+1.75rem)] top-6 hidden h-px w-[calc(100%-3.5rem)] bg-white/10 md:block" />
            ) : null}
            <div className={stepIconClass(step.state)}>
              {step.state === 'done' ? <Check className="h-5 w-5" /> : step.state === 'active' ? <Circle className="h-5 w-5" /> : index + 1}
            </div>
            <p className={cn('mt-4', stepLabelClass(step.state))}>
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function GoalsTabs({ activeTab, onChange }: GoalsTabsProps) {
  return <Tabs value={activeTab} onValueChange={onChange} options={(Object.keys(TAB_LABELS) as GoalsTab[]).map((tab) => ({ value: tab, label: TAB_LABELS[tab] }))} />
}

function GoalInputItem({ index, value, placeholder, onChange }: GoalInputItemProps) {
  return (
    <div className={cn('flex items-center', dashboardDesignSystem.spacing.inlineMd)}>
      <div className={dashboardDesignSystem.goals.inputIndex}>
        {index}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={dashboardDesignSystem.fields.input}
      />
    </div>
  )
}

function TabToday({ value, onChange, onSave }: TabTodayProps) {
  return (
    <div className={dashboardDesignSystem.spacing.stackMd}>
      <Card tone="alert" className="px-6 py-7">
        <p className={cn(dashboardDesignSystem.typography.label, dashboardDesignSystem.goals.dangerLabel)}>
          {TODAY_COPY.label}
        </p>
        <p className={cn('mt-5', dashboardDesignSystem.typography.bodyMuted)}>
          {TODAY_COPY.text}
        </p>
        <div className="mt-6 h-[6px] rounded-full bg-white/8">
          <div className={dashboardDesignSystem.goals.todayProgress} />
        </div>
      </Card>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Або введи свою дію на сьогодні..."
        className={dashboardDesignSystem.fields.textarea}
      />

      <button
        type="button"
        onClick={onSave}
        className={dashboardDesignSystem.buttons.primary}
      >
        Зафіксувати →
      </button>
    </div>
  )
}

function TabMonth({ values, onChange, onSave }: TabMonthProps) {
  return (
    <div className={dashboardDesignSystem.spacing.stackMd}>
      <div>
        <p className={cn(dashboardDesignSystem.typography.label, 'text-white/26')}>3 ДІЇ НА МІСЯЦЬ</p>
      </div>

      <div className="space-y-3">
        {values.map((value, index) => (
          <GoalInputItem
            key={`month-${index + 1}`}
            index={index + 1}
            value={value}
            placeholder="Дія на місяць..."
            onChange={(nextValue) => onChange(index, nextValue)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onSave}
        className={dashboardDesignSystem.buttons.primary}
      >
        Зберегти дії місяця
      </button>
    </div>
  )
}

function TabYear({ values, onChange, onSaveAndContinue }: TabYearProps) {
  return (
    <div className={dashboardDesignSystem.spacing.stackMd}>
      <div>
        <p className={cn(dashboardDesignSystem.typography.label, 'text-white/26')}>5 ЦІЛЕЙ НА РІК (AI перевірить кожну)</p>
      </div>

      <div className="space-y-3">
        {values.map((value, index) => (
          <GoalInputItem
            key={`year-${index + 1}`}
            index={index + 1}
            value={value}
            placeholder={`Ціль ${index + 1} на 6 місяців...`}
            onChange={(nextValue) => onChange(index, nextValue)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onSaveAndContinue}
        className={dashboardDesignSystem.buttons.primary}
      >
        Зберегти та перейти до Web Map →
      </button>
    </div>
  )
}

function BottomNavigation({ onBack, onNext }: BottomNavigationProps) {
  return (
    <footer className="flex items-center justify-between gap-4 pt-2">
      <button
        type="button"
        onClick={onBack}
        className={dashboardDesignSystem.buttons.secondary}
      >
        <ArrowLeft className="h-5 w-5" />
        Назад
      </button>

      <div className={dashboardDesignSystem.typography.overline}>
        КРОК 2 / 4
      </div>

      <button
        type="button"
        onClick={onNext}
        className={dashboardDesignSystem.buttons.ghost}
      >
        Web Map
        <ArrowRight className="h-5 w-5" />
      </button>
    </footer>
  )
}

export default function GoalsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trialActive, subscriptionActive } = useSystemState()
  const [activeTab, setActiveTab] = useState<GoalsTab>('today')
  const [todayGoal, setTodayGoal] = useState('')
  const [monthGoals, setMonthGoals] = useState(['', '', ''])
  const [yearGoals, setYearGoals] = useState(['', '', '', '', ''])

  const isTrial = trialActive && !subscriptionActive
  const displayName = user?.firstName || user?.name || 'User'

  const saveToast = (message: string) => {
    if (isTrial) {
      toast(message, {
        icon: '✨',
      })
      return
    }

    toast.success(message)
  }

  const handleMonthGoalChange = (index: number, value: string) => {
    setMonthGoals((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const handleYearGoalChange = (index: number, value: string) => {
    setYearGoals((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const yearCtaLabel = useMemo(
    () => (isTrial ? 'У повній версії це збережеться і синхронізується' : 'Цілі збережено'),
    [isTrial],
  )

  return (
    <div className={cn(dashboardDesignSystem.surfaces.page, 'px-4 py-8 sm:px-6 lg:px-8')}>
      <div className={dashboardDesignSystem.surfaces.container}>
        <StepHeader />

        <section className="space-y-8">
          <GoalsTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'today' ? (
            <TabToday
              value={todayGoal}
              onChange={setTodayGoal}
              onSave={() => saveToast('У повній версії це збережеться і синхронізується')}
            />
          ) : null}

          {activeTab === 'month' ? (
            <TabMonth
              values={monthGoals}
              onChange={handleMonthGoalChange}
              onSave={() => saveToast('У повній версії це збережеться і синхронізується')}
            />
          ) : null}

          {activeTab === 'year' ? (
            <TabYear
              values={yearGoals}
              onChange={handleYearGoalChange}
              onSaveAndContinue={() => {
                saveToast(yearCtaLabel)
                navigate(ROUTES.VISION)
              }}
            />
          ) : null}
        </section>

        <BottomNavigation
          onBack={() => navigate(ROUTES.WHEEL_START)}
          onNext={() => navigate(ROUTES.VISION)}
        />

        {isTrial ? (
          <div className={cn('text-center', dashboardDesignSystem.typography.helper)}>
            {displayName}, у trial ти можеш редагувати всі поля й перемикати таби. Збереження та синхронізація доступні у повній версії.
          </div>
        ) : null}
      </div>
    </div>
  )
}
