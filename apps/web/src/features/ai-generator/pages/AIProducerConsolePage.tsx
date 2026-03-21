// frontend/src/features/ai-generator/pages/AIProducerConsolePage.tsx
// ════════════════════════════════════════════════════════════════
// AI-Продюсер — конструктор AI-ментора повного циклу:
//   Trial 7 днів → Колесо балансу → 2×/день питання →
//   AI-аналіз → Мікрозавдання → Афірмації →
//   Тижневий звіт → Місячний звіт
//
// ✅ НУЛЬ inline styles   ✅ НУЛЬ backdrop-filter
// Стилі: Tailwind + CSS vars + src/styles/components/producer.scss
// ════════════════════════════════════════════════════════════════

import { ProducerIcon, ProducerMascotToggle } from '@/features/ai-generator/components/ProducerIcon'
import { WeeklyReportCard } from '@/features/producer/components/WeeklyReportCard'
import { useProducerChat } from '@/features/producer/hooks/useProducer'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Tab = 'builder' | 'lifecycle' | 'chat' | 'reports'
type FormData = Record<string, string>

interface PlanResult {
  concept:         string
  wheelSetup:      string
  trialSchedule:   string
  dailyQuestions:  { morning: string[]; evening: string[] }
  analysisLogic:   string
  microTaskSystem: string
  affirmations:    string
  weeklyReport:    string
  monthlyReport:   string
  telegramBot:     string
  monetization:    string
  launchPost:      string
  raw:             string
}

// ─────────────────────────────────────────────────────────────
// WIZARD STEPS — 8 кроків конструктора
// ─────────────────────────────────────────────────────────────
interface WizardField {
  key:         string
  label:       string
  placeholder: string
  rows?:       number
}

interface WizardStep {
  id:     number
  icon:   string
  tag:    string
  title:  string
  desc:   string
  tip:    string
  fields: WizardField[]
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1, icon: '🎯', tag: 'ОСНОВА',
    title: 'Назва та трансформація',
    desc:  'Як зветься ментор, яку трансформацію дає, хто аудиторія',
    tip:   'Формула: від [болю] → до [результату] за [строк]. Без маркетингових кліше.',
    fields: [
      { key: 'name',           label: 'Назва AI-ментора',   placeholder: 'Баланс та ціль by Nadya',                            rows: 1 },
      { key: 'transformation', label: 'Трансформація X → Y', placeholder: 'Від виснаження та хаосу → до ясності й енергії за 7 днів', rows: 2 },
      { key: 'audience',       label: 'Хто аудиторія',       placeholder: 'Жінки 28–45, мами/підприємці, шукають баланс між собою та роллями', rows: 2 },
    ],
  },
  {
    id: 2, icon: '☯️', tag: 'КОЛЕСО',
    title: 'Колесо балансу',
    desc:  '8 сфер оцінки та текст для запуску в Telegram',
    tip:   'Колесо заповнюється в день 1 trial і раз на тиждень після. Це джерело даних для AI-аналізу.',
    fields: [
      { key: 'wheelSpheres', label: '8 сфер (через кому)', placeholder: 'Здоров\'я, Фінанси, Стосунки, Робота, Розвиток, Відпочинок, Духовність, Оточення', rows: 2 },
      { key: 'wheelIntro',   label: 'Вступне повідомлення до колеса', placeholder: 'Оціни кожну сферу від 1 до 10. 1 — зовсім порожньо, 10 — повна гармонія. Відповідай чесно — це твоя точна точка відліку.', rows: 3 },
    ],
  },
  {
    id: 3, icon: '📅', tag: '7 ДНІВ',
    title: 'Trial — 7-денний пробний',
    desc:  'Структура пробного: ранок + вечір кожного дня, ключові точки',
    tip:   'День 1 = Колесо. День 4 = «дзеркало прогресу» (AI порівнює стан). День 7 = підсумок + оффер.',
    fields: [
      { key: 'trialMorningTime', label: 'Час ранкового питання', placeholder: '08:00', rows: 1 },
      { key: 'trialEveningTime', label: 'Час вечірнього питання', placeholder: '20:00', rows: 1 },
      { key: 'trialDay1', label: 'День 1 — ранкова тема',  placeholder: 'Привітання + Колесо балансу + перша ціль', rows: 2 },
      { key: 'trialDay4', label: 'День 4 — дзеркало',      placeholder: 'AI порівнює відповіді 1–4 дня: що змінилось у твоєму стані?', rows: 2 },
      { key: 'trialDay7', label: 'День 7 — оффер',         placeholder: 'Підсумок тижня + динаміка колеса + пропозиція продовжити підписку', rows: 2 },
    ],
  },
  {
    id: 4, icon: '🌅', tag: '2×/ДЕНЬ',
    title: 'Щоденні питання (ранок + вечір)',
    desc:  'Шаблони питань для платних підписників після trial',
    tip:   'Ранок: стан, намір, одне завдання. Вечір: підсумок, енергія, інсайт. AI генерує на основі відповідей.',
    fields: [
      { key: 'morningQ1', label: 'Ранок — Питання 1', placeholder: 'Як твій стан сьогодні по шкалі 1–10?',            rows: 1 },
      { key: 'morningQ2', label: 'Ранок — Питання 2', placeholder: 'Що одне найважливіше ти зробиш сьогодні?',        rows: 1 },
      { key: 'morningQ3', label: 'Ранок — Питання 3', placeholder: 'Яка твоя намірна думка на цей день?',             rows: 1 },
      { key: 'eveningQ1', label: 'Вечір — Питання 1', placeholder: 'Що тебе порадувало або підтримало сьогодні?',     rows: 1 },
      { key: 'eveningQ2', label: 'Вечір — Питання 2', placeholder: 'Що забрало найбільше енергії? А що дало?',        rows: 1 },
      { key: 'eveningQ3', label: 'Вечір — Питання 3', placeholder: 'Один інсайт дня — одним реченням.',               rows: 1 },
    ],
  },
  {
    id: 5, icon: '🧠', tag: 'АНАЛІЗ',
    title: 'AI-аналіз відповідей',
    desc:  'Що і як аналізує AI, коли ескалює, коли пропонує апсел',
    tip:   'AI зчитує: емоційний тон, дренажі, патерни поведінки, готовність до апселу. Все автоматично.',
    fields: [
      { key: 'analysisDepth',   label: 'Фокус аналізу',        placeholder: 'Динаміка стану + баланс сфер + відповідність цілі + дренажі', rows: 2 },
      { key: 'analysisSignals', label: 'Сигнали ескалації',     placeholder: 'Якщо стан < 4 два дні поспіль → відправити підтримуюче повідомлення від ментора', rows: 2 },
      { key: 'analysisUpsell',  label: 'Сигнал до апселу',     placeholder: 'Якщо 5+ днів відповідей + стан > 7 + виконано 4+ мікрозавдання → пропонувати VIP', rows: 2 },
    ],
  },
  {
    id: 6, icon: '✅', tag: 'ЗАВДАННЯ',
    title: 'Мікрозавдання',
    desc:  'AI генерує одне персональне завдання кожен ранок після питань',
    tip:   '1 завдання = 5–20 хвилин. Базується на найнижчій сфері колеса + поточному стані.',
    fields: [
      { key: 'microTaskLogic', label: 'Логіка генерації', placeholder: 'На основі найнижчої сфери колеса + стану дня + дренажів тижня', rows: 2 },
      { key: 'microTaskTypes', label: 'Типи завдань',     placeholder: 'Рефлексія, тілесна практика, контакт з людиною, відпочинок, одна конкретна дія', rows: 2 },
      { key: 'microTaskTime',  label: 'Макс. час (хв)',   placeholder: '20', rows: 1 },
    ],
  },
  {
    id: 7, icon: '💫', tag: 'АФІРМАЦІЇ',
    title: 'Персональні афірмації',
    desc:  'AI генерує одну афірмацію щодня після ранкових питань',
    tip:   'Афірмація — не "я буду багатою", а підтвердження вже існуючого руху. Від першої особи, теперішній час.',
    fields: [
      { key: 'affirmStyle',   label: 'Стиль',      placeholder: 'Від першої особи, теперішній час, конкретна сфера, без "хочу/буду"', rows: 2 },
      { key: 'affirmTrigger', label: 'Коли',        placeholder: 'Після відповіді на ранкові питання, перед мікрозавданням — о 08:05', rows: 1 },
      { key: 'affirmExample', label: 'Приклад',     placeholder: 'Я вибираю спокій навіть коли навколо хаос', rows: 1 },
    ],
  },
  {
    id: 8, icon: '📊', tag: 'ЗВІТИ',
    title: 'Тижневий та місячний звіт',
    desc:  'PDF-звіти з AI-аналізом, розклад генерації та відправки',
    tip:   'Тижневий — неділя 08:00 генерація, 10:00 PDF в Telegram. Місячний — останній день місяця.',
    fields: [
      { key: 'weeklyReportSections',  label: 'Розділи тижневого звіту',  placeholder: 'Загальний бал, динаміка колеса, топ-3 інсайти, дренажі, мікрозавдання, фокус наступного тижня', rows: 2 },
      { key: 'monthlyReportSections', label: 'Розділи місячного звіту',  placeholder: 'Прогрес по цілях, динаміка 4 тижнів колеса, патерни поведінки, рекомендація AI, оффер', rows: 2 },
      { key: 'reportTone',            label: 'Тон звіту',                placeholder: 'Підтримуючий, конкретний, чесний аналіз без перебільшень', rows: 1 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// LIFECYCLE SECTIONS — для таб «Як це працює»
// ─────────────────────────────────────────────────────────────
interface LifecyclePhase {
  id:       string
  icon:     string
  period:   string
  title:    string
  color:    string      // CSS var name
  items:    { time: string; action: string; auto: boolean }[]
}

const LIFECYCLE: LifecyclePhase[] = [
  {
    id: 'trial', icon: '📅', period: 'Дні 1–7', title: 'Trial (Пробний)',
    color: 'var(--accent-soft)',
    items: [
      { time: 'День 1 · 08:00', action: 'Привітання + Колесо балансу (8 сфер)',          auto: true  },
      { time: 'День 1 · 20:00', action: 'Перше вечірнє питання',                          auto: true  },
      { time: 'Дні 2–3',        action: '2×/день питання + афірмація + мікрозавдання',    auto: true  },
      { time: 'День 4 · 08:00', action: '🔍 AI-дзеркало: порівняння стану 1→4',           auto: true  },
      { time: 'Дні 5–6',        action: '2×/день питання + AI-аналіз відповідей',         auto: true  },
      { time: 'День 7 · 08:00', action: '🎯 Підсумок тижня + тижневий PDF-звіт + ОФФЕР', auto: true  },
    ],
  },
  {
    id: 'daily', icon: '🌅', period: 'Щодня', title: 'Щоденний цикл (після trial)',
    color: 'var(--gold)',
    items: [
      { time: '08:00',  action: 'Ранкові питання (3 шт.) в Telegram',            auto: true  },
      { time: '08:05',  action: '💫 Персональна афірмація (AI генерує на льоту)', auto: true  },
      { time: '08:10',  action: '✅ Мікрозавдання (AI, на основі стану + колеса)', auto: true  },
      { time: 'Протягом дня', action: 'Юзер виконує завдання, AI фіксує',        auto: false },
      { time: '20:00',  action: 'Вечірні питання (3 шт.)',                        auto: true  },
      { time: '20:05',  action: '🧠 AI-аналіз дня (тон, дренажі, прогрес)',       auto: true  },
    ],
  },
  {
    id: 'weekly', icon: '📊', period: 'Щонеділі', title: 'Тижневий звіт',
    color: 'var(--accent)',
    items: [
      { time: 'Нд · 08:00', action: 'AI збирає дані: відповіді, колесо, завдання, streak', auto: true },
      { time: 'Нд · 08:30', action: 'GPT-4o генерує аналіз + рекомендації',                auto: true },
      { time: 'Нд · 09:00', action: 'Генерація PDF-звіту (9 розділів)',                    auto: true },
      { time: 'Нд · 10:00', action: '📨 PDF надсилається в Telegram',                      auto: true },
      { time: 'Нд · 10:05', action: 'Оновлення колеса балансу — новий тиждень',            auto: false },
      { time: 'Якщо готовий', action: '💎 М\'який апсел-оффер у звіті',                   auto: true },
    ],
  },
  {
    id: 'monthly', icon: '📈', period: 'Щомісяця', title: 'Місячний звіт',
    color: 'var(--accent-strong)',
    items: [
      { time: '1-е число · 09:00', action: 'Нагадування оновити колесо — новий місяць',   auto: true  },
      { time: 'Ост. день · 22:00', action: 'AI збирає дані 4 тижнів + динаміку колеса',   auto: true  },
      { time: 'Ост. день · 23:00', action: 'GPT генерує місячний аналіз + патерни',        auto: true  },
      { time: '+1 день · 09:00',   action: '📨 Місячний PDF + персоналізований оффер',     auto: true  },
      { time: 'За потреби',        action: 'Ескалація: якщо стан < 4 три дні поспіль',     auto: true  },
    ],
  },
]

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'builder',   icon: '🏗',  label: 'Конструктор' },
  { id: 'lifecycle', icon: '⚙️',  label: 'Як це працює' },
  { id: 'chat',      icon: '💬',  label: 'AI Чат'       },
  { id: 'reports',   icon: '📊',  label: 'Звіти'        },
]

const QUICK_QUESTIONS = [
  'Напиши готові ранкові питання для теми «Баланс та ціль»',
  'Як AI визначає сигнал до апселу? Дай готову логіку.',
  'Напиши текст дня 7 trial з офером підписки',
  'Дай 10 афірмацій для жінок 30–45 по сфері «Здоров\'я»',
  'Що включити в тижневий PDF-звіт? Напиши структуру.',
  'Напиши текст дзеркала прогресу для дня 4',
]

// ─────────────────────────────────────────────────────────────
// STEP FORM
// ─────────────────────────────────────────────────────────────
function StepForm({
  step, data, onChange, onNext, onBack, isFirst, isLast, isGenerating,
}: {
  step:         WizardStep
  data:         FormData
  onChange:     (k: string, v: string) => void
  onNext:       () => void
  onBack:       () => void
  isFirst:      boolean
  isLast:       boolean
  isGenerating: boolean
}) {
  const allFilled = step.fields.every(f =>
    f.key === 'trialMorningTime' || f.key === 'trialEveningTime' || f.key === 'microTaskTime'
      ? true                             // необов'язкові — мають дефолт
      : (data[f.key] ?? '').trim().length > 0
  )

  return (
    <div className="animate-fade-up space-y-4">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="producer-avatar w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 producer-glow">
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold tracking-widest producer-surface text-[var(--gold)] px-2 py-0.5 rounded-full">
              {step.tag}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Крок {step.id} з {WIZARD_STEPS.length}
            </span>
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] leading-snug">{step.title}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{step.desc}</p>
        </div>
        <ProducerIcon tip={step.tip} side="left" size={30} />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {step.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {field.label}
            </label>
            <textarea
              rows={field.rows ?? 2}
              className="w-full producer-input rounded-xl px-3 py-2 text-sm resize-none leading-relaxed"
              placeholder={field.placeholder}
              value={data[field.key] ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-1">
        {!isFirst && (
          <button
            type="button"
            className="producer-tab rounded-xl px-4 py-2.5 text-sm font-semibold flex-shrink-0 transition-all"
            onClick={onBack}
          >
            ← Назад
          </button>
        )}
        <button
          type="button"
          disabled={!allFilled || isGenerating}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
            isLast ? 'producer-glow' : '',
            'producer-tab--active',
            (!allFilled || isGenerating) && 'opacity-40 cursor-not-allowed',
          )}
          onClick={onNext}
        >
          {isLast
            ? (isGenerating ? '✨ Генерую AI-ментора...' : '✨ Згенерувати AI-ментора')
            : `Далі → Крок ${step.id + 1}`}
        </button>
      </div>

      {!allFilled && (
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Заповни всі поля щоб перейти далі
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BUILDER TAB
// ─────────────────────────────────────────────────────────────
function BuilderTab({ onDone }: { onDone: (plan: PlanResult, name: string) => void }) {
  const [stepIdx,      setStepIdx]      = useState(0)
  const [formData,     setFormData]     = useState<FormData>({
    trialMorningTime: '08:00',
    trialEveningTime: '20:00',
    microTaskTime:    '20',
  })
  const [completed,    setCompleted]    = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [error,        setError]        = useState('')
  const fillRef = useRef<HTMLDivElement>(null)

  const pct = (completed.size / WIZARD_STEPS.length) * 100
  useEffect(() => {
    fillRef.current?.style.setProperty('--step-pct', `${pct}%`)
  }, [pct])

  const handleChange = useCallback((k: string, v: string) => {
    setFormData(prev => ({ ...prev, [k]: v }))
  }, [])

  const handleNext = async () => {
    setCompleted(prev => new Set([...prev, stepIdx]))

    if (stepIdx < WIZARD_STEPS.length - 1) {
      setStepIdx(s => s + 1)
      return
    }

    // Фінальна генерація
    setIsGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/producer/generate-mentor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wizardData: formData }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { plan } = await res.json()
      onDone(plan, formData.name ?? 'AI-ментор')
    } catch (e) {
      setError('Помилка генерації. Перевір з\'єднання і спробуй ще раз.')
    } finally {
      setIsGenerating(false)
    }
  }

  const step = WIZARD_STEPS[stepIdx]

  return (
    <div className="flex-1 overflow-y-auto p-5">

      {/* Progress */}
      <div className="mb-5">
        {/* Step pills */}
        <div className="flex gap-1 flex-wrap mb-2">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { if (i <= stepIdx || completed.has(i)) setStepIdx(i) }}
              className={cn(
                'text-[10px] px-2 py-1 rounded-full font-bold transition-all',
                i === stepIdx
                  ? 'producer-tab--active'
                  : completed.has(i)
                    ? 'producer-surface text-[var(--color-success)]'
                    : 'producer-tab opacity-40 cursor-default',
              )}
              title={s.title}
            >
              {completed.has(i) ? '✓' : s.icon} {s.id}
            </button>
          ))}
        </div>

        {/* Bar */}
        <div className="producer-step-bar h-1">
          <div ref={fillRef} className="producer-step-fill" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text-muted)]">{step.tag}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{completed.size}/{WIZARD_STEPS.length} кроків</span>
        </div>
      </div>

      {/* Step form */}
      <StepForm
        step={step}
        data={formData}
        onChange={handleChange}
        onNext={handleNext}
        onBack={() => setStepIdx(s => s - 1)}
        isFirst={stepIdx === 0}
        isLast={stepIdx === WIZARD_STEPS.length - 1}
        isGenerating={isGenerating}
      />

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-400 section-danger">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LIFECYCLE TAB
// ─────────────────────────────────────────────────────────────
function LifecycleTab() {
  const [activePhase, setActivePhase] = useState('trial')

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 animate-fade-in">

      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs tracking-widest uppercase text-[var(--gold)] flex-1">
          Повний цикл AI-ментора
        </p>
        <ProducerIcon
          tip="Всі ці дії виконуються автоматично через scheduler. Ти тільки налаштовуєш — AI робить все."
          side="left"
        />
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 flex-wrap">
        {LIFECYCLE.map(phase => (
          <button
            key={phase.id}
            type="button"
            onClick={() => setActivePhase(phase.id)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full font-semibold transition-all',
              activePhase === phase.id ? 'producer-tab--active' : 'producer-tab',
            )}
          >
            {phase.icon} {phase.period}
          </button>
        ))}
      </div>

      {LIFECYCLE.filter(p => p.id === activePhase).map(phase => (
        <div key={phase.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{phase.icon}</span>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{phase.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{phase.period}</p>
            </div>
          </div>

          {/* Timeline items */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-[var(--gold)] via-[rgba(212,175,55,.3)] to-transparent" />

            <div className="space-y-2">
              {phase.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  {/* Node */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs z-10',
                    item.auto ? 'producer-surface producer-border' : 'bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.08)]',
                  )}>
                    {item.auto ? '⚡' : '👤'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <span className="text-[10px] font-mono text-[var(--gold)] block mb-0.5">
                      {item.time}
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                      {item.action}
                    </p>
                  </div>

                  {/* Auto badge */}
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold mt-1',
                    item.auto
                      ? 'producer-surface text-[var(--gold)]'
                      : 'bg-[rgba(255,255,255,.04)] text-[var(--text-muted)]',
                  )}>
                    {item.auto ? 'AUTO' : 'USER'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Monetization block */}
      <div className="liquid-glass p-4 rounded-2xl">
        <p className="text-xs font-bold text-[var(--gold)] uppercase tracking-widest mb-3">
          💎 Монетизація
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { tier: 'Базова',   price: '299 грн/міс', feat: '2×/день питання · Тижневий звіт · Streak' },
            { tier: 'Стандарт', price: '599 грн/міс', feat: '+ Афірмації · Мікрозавдання · AI-аналіз'  },
            { tier: 'VIP',      price: '999 грн/міс', feat: '+ Місячний звіт · Колесо щотижня · Підтримка' },
          ].map(t => (
            <div key={t.tier} className="producer-surface rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-[var(--text-primary)] mb-1">{t.tier}</p>
              <p className="text-sm font-black text-[var(--gold)]">{t.price}</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-1 leading-relaxed">{t.feat}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
          Trial 7 днів безкоштовно → оффер на день 7 → конверсія
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CHAT TAB
// ─────────────────────────────────────────────────────────────
function ChatTab({ context }: { context: string }) {
  const { messages, send, isLoading } = useProducerChat()
  const [input,  setInput]  = useState('')
  const endRef              = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    send(text, context)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Context strip */}
      {context && (
        <div className="px-4 py-2 text-xs producer-border-soft border-b flex items-center gap-2 flex-shrink-0 bg-[rgba(0,0,0,0.18)]">
          <span className="text-[var(--gold)] flex-1 truncate">{context}</span>
          <button
            type="button"
            className="producer-surface text-[var(--gold)] text-xs px-2 py-0.5 rounded-full flex-shrink-0 hover:opacity-80 transition-opacity"
            onClick={() => setInput(`${context}\n\nПобудуй детальну структуру з готовими текстами та прикладами для Telegram.`)}
          >
            ↓ Вставити
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-8 space-y-4 animate-fade-in">
            <span className="text-4xl block">✦</span>
            <p className="text-sm font-semibold text-[var(--gold)]">AI-Продюсер готовий</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
              Заповни конструктор або запитай про будь-який елемент AI-ментора
            </p>
            <div className="space-y-2 max-w-sm mx-auto">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  className="producer-quick-q w-full text-left text-xs px-3 py-2 rounded-lg text-[var(--text-secondary)]"
                  onClick={() => send(q, context)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <div className="producer-avatar w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                ✦
              </div>
            )}
            <div className={cn(
              'max-w-[82%] text-sm leading-relaxed whitespace-pre-wrap px-4 py-3',
              m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai',
            )}>
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center">
            <div className="producer-avatar w-7 h-7 rounded-full flex items-center justify-center text-sm">✦</div>
            <div className="chat-bubble-ai px-4 py-3 flex gap-1.5">
              <span className="producer-dot w-2 h-2 rounded-full bg-[var(--gold)]" />
              <span className="producer-dot w-2 h-2 rounded-full bg-[var(--gold)]" />
              <span className="producer-dot w-2 h-2 rounded-full bg-[var(--gold)]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 producer-border-soft border-t flex-shrink-0 bg-[rgba(0,0,0,0.25)]">
        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            value={input}
            placeholder="Питання до AI-продюсера... (Enter = надіслати, Shift+Enter = новий рядок)"
            className="flex-1 rounded-xl px-3 py-2 text-sm resize-none producer-input"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
          />
          <button
            type="button"
            disabled={isLoading || !input.trim()}
            className="producer-send-btn w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            onClick={handleSend}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────
function ReportsTab() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const weeklyItems = [
    ['🕗 Нд 08:00', 'AI збирає всі дані тижня: відповіді, колесо, завдання, streak'],
    ['🧠 Нд 08:30', 'GPT-4o аналізує: тон, дренажі, патерни, прогрес по цілі'],
    ['📄 Нд 09:00', 'Генерація PDF: 9 розділів з персональними текстами'],
    ['📨 Нд 10:00', 'PDF надсилається в Telegram + сповіщення в app'],
    ['☯️ Розділи',  'Загальний бал · Колесо (динаміка) · Топ-3 інсайти · Дренажі · Мікрозавдання · Фокус тижня'],
    ['💎 Якщо готовий', 'М\'який апсел у звіті (якщо стан > 7 і 5+ днів виконання)'],
  ]

  const monthlyItems = [
    ['📅 1-е · 09:00',    'Нагадування оновити колесо — початок нового місяця'],
    ['🕗 Ост. день 22:00','AI збирає дані 4 тижнів + динаміку колеса'],
    ['🧠 Ост. день 23:00','GPT аналізує: місячні патерни, блокери, що рухає'],
    ['📨 +1 день 09:00',  'Місячний PDF + персоналізований оффер наступного рівня'],
    ['📊 Розділи',        'Прогрес цілей · Динаміка 4 тижнів · Патерни · Рекомендація AI · Оффер'],
    ['⚠️ Ескалація',      'Якщо стан < 4 три дні поспіль → автоматично відправляє підтримку'],
  ]

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 animate-fade-in">

      {/* Period toggle */}
      <div className="flex items-center gap-3">
        <div className="inline-flex producer-border rounded-full p-1 gap-1">
          {(['weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                period === p ? 'producer-tab--active' : 'producer-tab',
              )}
            >
              {p === 'weekly' ? '📊 Тижневий' : '📈 Місячний'}
            </button>
          ))}
        </div>
        <ProducerIcon
          tip={period === 'weekly'
            ? 'Тижневий звіт — автоматично кожної неділі. Збирає дані → аналізує → PDF → Telegram.'
            : 'Місячний звіт — в останній день місяця. Динаміка 4 тижнів + патерни + персональний оффер.'}
          side="left"
        />
      </div>

      {/* Schedule */}
      <div className="liquid-glass p-4 rounded-2xl space-y-3">
        {(period === 'weekly' ? weeklyItems : monthlyItems).map(([time, desc]) => (
          <div key={time} className="flex gap-3 text-xs">
            <span className="font-mono text-[var(--gold)] flex-shrink-0 w-32 leading-relaxed">{time}</span>
            <span className="text-[var(--text-secondary)] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>

      {/* WeeklyReportCard */}
      <WeeklyReportCard userMode />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AIProducerConsolePage() {
  const [tab,         setTab]         = useState<Tab>('builder')
  const [chatContext, setChatContext] = useState('')
  const producerChat                  = useProducerChat()

  const handleBuilderDone = useCallback((plan: PlanResult, name: string) => {
    const summary = [
      `✅ AI-ментор «${name}» створено!`,
      '',
      `🎯 ${plan.concept}`,
      '',
      `☯️ Колесо: ${plan.wheelSetup?.slice(0, 120)}...`,
      '',
      `📅 Trial: ${plan.trialSchedule?.slice(0, 120)}...`,
      '',
      'Задавай питання щоб допрацювати деталі.',
    ].join('\n')

    producerChat.init(summary)
    setChatContext(`AI-ментор «${name}» — допрацювання деталей`)
    setTab('chat')
  }, [producerChat])

  return (
    <div className="flex flex-col h-full min-h-screen producer-bg text-[var(--text-primary)]">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 flex-wrap producer-border-soft border-b bg-[rgba(0,0,0,0.32)]">
        <div className="producer-avatar w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0 producer-glow">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-widest uppercase text-[var(--gold)]">STARWAY STUDIO</p>
          <h1 className="text-base font-bold leading-tight text-[var(--text-primary)]">AI-Продюсер</h1>
        </div>

        <ProducerMascotToggle />

        <nav className="flex gap-1 items-center flex-nowrap overflow-x-auto scrollbar-none">
          {TABS.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'nav-tab-responsive',
                tab === id ? 'producer-tab--active' : 'producer-tab',
              )}
              title={label}
              aria-label={label}
            >
              <span className="btn-icon" aria-hidden="true">{icon}</span>
              <span className="nav-tab-label">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">

        {tab === 'builder' && (
          <BuilderTab onDone={handleBuilderDone} />
        )}

        {tab === 'lifecycle' && <LifecycleTab />}

        {tab === 'chat' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatTab context={chatContext} />
          </div>
        )}

        {tab === 'reports' && <ReportsTab />}

      </div>
    </div>
  )
}
