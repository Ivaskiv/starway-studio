import { GlassCard, InfoHint } from '@/ui'
import { useMemo, useState } from 'react'
import { DASHBOARD_EYEBROW_CLASS } from './dashboardPrimitives'

export const FUNNEL_STEPS = [
  {
    step: 'D0',
    title: 'Реєстрація → Привітання',
    description: 'Автоматично через 5 хвилин після реєстрації. Telegram + email. Персоналізовано з іменем. Заклик: пройти колесо балансу.',
    trigger: 'trigger: user.createdAt + 5min',
    tone: 'bg-[rgba(99,102,241,0.14)] text-[rgb(165,180,252)]',
  },
  {
    step: 'D1',
    title: 'День 1 → Нагадування якщо не почав',
    description: 'Якщо колесо не пройдено через 24 години — м’яке нагадування. Якщо пройшов — підтвердження і перший інсайт.',
    trigger: 'trigger: wheelSnapshot IS NULL AND createdAt + 24h',
    tone: 'bg-[rgba(96,165,250,0.14)] text-[rgb(147,197,253)]',
  },
  {
    step: 'D3',
    title: '3 дні → milestone + соціальний доказ',
    description: 'Якщо юзер активний: “Ти вже 3 дні в системі — більшість кидають на першому дні. Ти серед тих, хто тримається.”',
    trigger: 'trigger: streakDays === 3',
    tone: 'bg-[rgba(45,212,191,0.14)] text-[rgb(94,234,212)]',
  },
  {
    step: 'D5',
    title: 'День 5 → готовність до покупки',
    description: 'Якщо completion rate високий — м’яка згадка Premium. Якщо низький — питання “Що можна покращити?”',
    trigger: 'if completionRate >= 0.6: show premium · else: survey',
    tone: 'bg-[rgba(250,204,21,0.14)] text-[rgb(253,224,71)]',
  },
  {
    step: 'D6',
    title: 'День 6 → персональна пропозиція',
    description: 'Надя надсилає більш особисте повідомлення на основі слабкої сфери, кейсу й конкретної обіцянки від Premium.',
    trigger: 'trigger: trialStep >= 6 AND subscriptionStatus === free',
    tone: 'bg-[rgba(251,146,60,0.14)] text-[rgb(253,186,116)]',
  },
  {
    step: 'D7',
    title: 'День 7 → дедлайн + спеціальна ціна',
    description: 'Останній день trial. Якщо не купив — нагадування з urgency. Якщо активний — додаємо бонус або Zoom-сесію.',
    trigger: 'trigger: trialEndsIn <= 24h AND subscriptionStatus === free',
    tone: 'bg-[rgba(244,114,182,0.14)] text-[rgb(251,182,206)]',
  },
  {
    step: 'D14',
    title: 'День 14 → реактивація якщо не купив',
    description: 'Через тиждень після завершення trial повертаємо повідомленням: “Твій ритм досі можна зібрати з того місця, де зупинились.”',
    trigger: 'trigger: trialEndedAt + 7days AND subscriptionStatus === free',
    tone: 'bg-[rgba(59,130,246,0.14)] text-[rgb(147,197,253)]',
  },
] as const

export function DesktopFunnelPreview({
  title,
  description,
  trigger,
}: {
  title: string
  description: string
  trigger: string
}) {
  return (
    <div className="rounded-[30px] border border-[rgba(var(--accent-rgb),0.16)] bg-[linear-gradient(180deg,rgba(10,14,28,0.96),rgba(12,18,34,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_20px_60px_rgba(5,8,20,0.42)]">
      <div className="rounded-[24px] border border-[rgba(var(--accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
          Funnel Automation
        </p>
        <h3 className="mt-3 text-[1.5rem] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        <div className="mt-5 rounded-[18px] border border-[rgba(var(--accent-rgb),0.14)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
          {trigger}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-[18px] border border-[rgba(var(--accent-soft-rgb),0.28)] bg-[linear-gradient(135deg,rgba(101,111,242,0.98),rgba(123,137,255,0.94))] px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(77,92,255,0.28)]"
          >
            Відкрити сценарій
          </button>
          <button
            type="button"
            className="rounded-[18px] border border-[rgba(77,241,214,0.3)] bg-[linear-gradient(135deg,rgba(49,225,203,0.92),rgba(108,123,255,0.92))] px-5 py-4 text-sm font-semibold text-[#09111f] shadow-[0_16px_42px_rgba(57,206,189,0.2)]"
          >
            Увімкнути автоматично
          </button>
        </div>
      </div>
    </div>
  )
}

export function MiniAppFunnelPreview({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[36px] border border-[rgba(var(--accent-rgb),0.24)] bg-[linear-gradient(180deg,rgba(7,10,20,0.98),rgba(10,14,28,0.95))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(6,10,22,0.52)]">
      <div className="rounded-[28px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(15,19,36,0.92)] pt-4">
        <div className="mx-auto h-3 w-3 rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(255,255,255,0.03)]" />
        <div className="mt-4 flex items-center justify-between border-b border-[rgba(var(--accent-rgb),0.12)] px-5 pb-4">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">⭐ Starway <span className="font-medium text-[var(--text-muted)]">Automation</span></p>
          <span className="rounded-full border border-[rgba(57,241,207,0.14)] bg-[rgba(32,125,109,0.24)] px-3 py-1 text-xs font-semibold text-[rgb(57,241,207)]">
            {step}
          </span>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[24px] border border-[rgba(var(--accent-rgb),0.18)] bg-[linear-gradient(180deg,rgba(23,31,52,0.86),rgba(21,28,44,0.74))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Повідомлення дня
            </p>
            <h3 className="mt-3 text-[1.25rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                className="w-full rounded-[16px] border border-[rgba(var(--accent-soft-rgb),0.26)] bg-[linear-gradient(135deg,rgba(101,111,242,0.98),rgba(123,137,255,0.94))] px-4 py-3 text-[15px] font-semibold text-white"
              >
                Відкрити повідомлення
              </button>
              <button
                type="button"
                className="w-full rounded-[16px] border border-[rgba(77,241,214,0.3)] bg-[linear-gradient(135deg,rgba(49,225,203,0.92),rgba(108,123,255,0.92))] px-4 py-3 text-[15px] font-semibold text-[#09111f]"
              >
                Перевірити флоу
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FunnelAutomationPanel() {
  const [activeStepId, setActiveStepId] = useState<(typeof FUNNEL_STEPS)[number]['step']>(FUNNEL_STEPS[0]?.step ?? 'D0')

  const activeStep = useMemo(
    () => FUNNEL_STEPS.find((step) => step.step === activeStepId) ?? FUNNEL_STEPS[0],
    [activeStepId],
  )

  if (!activeStep) return null

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className={DASHBOARD_EYEBROW_CLASS}>Воронка</p>
              <InfoHint
                label="Воронка D0 → D14"
                description="Логіка автоматичних повідомлень по поведінці юзера: від реєстрації до прогріву, дедлайну і реактивації."
                instruction="На кожному кроці важливо бачити умову запуску, текстовий намір і канал. Далі можна окремо додати редагування кожного кроку без дублювання сценаріїв."
              />
            </div>
            <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Повідомлення по поведінці</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Єдина структура для сайту, mini app і Telegram: один крок, одна умова, один зміст повідомлення, без різних версій одного й того ж флоу.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6">
        {FUNNEL_STEPS.map((step) => (
          <button
            key={step.step}
            type="button"
            onClick={() => setActiveStepId(step.step)}
            className={[
              'block w-full rounded-[24px] border p-5 text-left transition-all',
              activeStep.step === step.step
                ? 'border-[rgba(var(--accent-soft-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)] shadow-[0_16px_42px_rgba(15,23,42,0.18)]'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)]',
            ].join(' ')}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex items-start gap-4">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${step.tone}`}>
                  {step.step}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[var(--text-primary)]">
              {step.trigger}
            </div>
          </button>
        ))}

        <div className="rounded-[22px] border border-[rgba(96,165,250,0.35)] bg-[rgba(96,165,250,0.08)] px-5 py-4">
          <p className="text-sm leading-7 text-[var(--text-primary)]">
            Відредагуй кожен крок як окрему картку: текст, умову, регенерацію формулювання і вмикання/вимикання сценарію. Далі це можна зв’язати з одним і тим самим повідомленням для сайту, mini app і Telegram без дублювання логіки.
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
