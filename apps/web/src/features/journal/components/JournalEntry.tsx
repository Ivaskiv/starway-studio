// apps/web/src/features/journal/components/JournalEntry.tsx
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import { ROUTES } from '@/config/routes'
import type { JournalDayState } from '../types'

interface JournalEntryProps {
  day: JournalDayState
}

function buildSections(day: JournalDayState) {
  const analysisDone = Boolean(day.finalizedAt)

  return [
    {
      key: 'morning',
      title: 'Ранок',
      helper: day.reflection.morning.status === 'done' ? 'Стан дня зафіксовано.' : 'Ще не заповнено.',
      done: day.reflection.morning.status === 'done',
      href: `${ROUTES.CYCLE}?session=morning&date=${day.dateKey}`,
      action: day.reflection.morning.status === 'done' ? 'Відкрити' : 'Продовжити',
    },
    {
      key: 'tasks',
      title: 'Мікрозавдання',
      helper: day.microTasks.completedCount > 0
        ? 'Є завершені кроки й рух по дню.'
        : day.microTasks.activeCount > 0
          ? 'Є відкриті задачі на сьогодні.'
          : 'Ще не з’явилися або не відкривались.',
      done: day.microTasks.completedCount > 0 && day.microTasks.activeCount === 0 && day.microTasks.missedCount === 0,
      href: `${ROUTES.TASKS}?date=${day.dateKey}`,
      action: day.microTasks.completedCount > 0 || day.microTasks.activeCount > 0 ? 'Відкрити' : 'Почати',
    },
    {
      key: 'evening',
      title: 'Вечір',
      helper: day.reflection.evening.status === 'done' ? 'Вечірній підсумок збережено.' : 'Ще не закрито.',
      done: day.reflection.evening.status === 'done',
      href: `${ROUTES.CYCLE}?session=evening&date=${day.dateKey}`,
      action: day.reflection.evening.status === 'done' ? 'Відкрити' : 'Продовжити',
    },
    {
      key: 'analysis',
      title: 'Аналіз дня',
      helper: analysisDone ? 'День уже завершено й підсумовано.' : 'Очікує фінального завершення.',
      done: analysisDone,
      href: `${ROUTES.CYCLE}?session=evening&date=${day.dateKey}`,
      action: analysisDone ? 'Переглянути' : 'Завершити',
    },
  ]
}

function getIndicator(done: boolean) {
  if (done) return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
  return <Circle className="h-4 w-4 text-white/35" />
}

export function JournalEntry({ day }: JournalEntryProps) {
  const sections = buildSections(day)
  const dateLabel = new Date(day.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

  return (
    <section className="glass-card overflow-hidden border border-[rgba(92,136,255,0.12)] bg-[linear-gradient(180deg,rgba(37,70,144,0.22),rgba(8,13,24,0.94))] p-4 shadow-[0_24px_64px_rgba(8,15,32,0.28)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[rgb(var(--accent-soft-rgb))]">Чекплан дня</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{dateLabel}</h3>
          <p className="mt-1 text-sm text-white/68">Що вже закрито, а що ще чекає завершення.</p>
        </div>
        <div className="rounded-[18px] border border-[rgba(92,136,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">XP</p>
          <p className="mt-1 text-2xl font-semibold text-white">{day.summary.xp}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {sections.map(section => (
          <Link
            key={section.key}
            to={section.href}
            className="group rounded-[22px] border border-[rgba(92,136,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4 shadow-[0_10px_30px_rgba(5,10,22,0.14)] transition hover:border-[rgba(119,164,255,0.14)] hover:bg-[rgba(255,255,255,0.03)] focus-visible:border-[rgba(119,164,255,0.18)] focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(119,164,255,0.1),0_14px_34px_rgba(15,34,70,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{section.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/62">{section.helper}</p>
              </div>
              <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(92,136,255,0.08)] bg-white/[0.04]">
                {getIndicator(section.done)}
              </span>
            </div>

            <span className="nav-btn-next mt-4 inline-flex">
              {section.action}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default JournalEntry
