import { RefreshCcw, X } from 'lucide-react'

import { MicroTaskList } from '@/features/microTask/components/MicroTaskList'
import type { MicroTask as MicroTaskItem } from '@/features/microTask/types/types'

import RecoveryMicrotasksPanel from './RecoveryMicrotasksPanel'
import type { AiMentorDashboardScreenState } from '../../hooks/useAiMentorDashboardScreenState'

type Props = {
  state: AiMentorDashboardScreenState
}

export default function AiMentorDashboardMicrotasksTab({ state }: Props) {
  const recoveryTasks = state.visibleMicroTasks.filter(task => (
    task.status === 'manual'
    || task.taskKind === 'manual'
    || task.source === 'manual'
  ))

  return (
    <div className="relative space-y-6">
      {state.microtaskPromptActive && state.microtaskPromptStage === 'choice' ? (
        <div
          className="absolute inset-0 z-20 flex items-start justify-center bg-[rgba(4,8,16,0.68)] px-4 py-6 backdrop-blur-sm"
          onClick={state.closeMicrotaskPrompt}
        >
          <div
            className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.94),rgba(10,18,36,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Закрити"
              className="absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-colors hover:bg-white/10 hover:text-white"
              onClick={state.closeMicrotaskPrompt}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              {state.isRecoveryMicrotaskDate
                ? 'ДОЗАВЕРШЕННЯ ВЧОРАШНЬОГО ДНЯ'
                : 'МІКРОЗАВДАННЯ НА СЬОГОДНІ'}
            </p>
            {state.microtaskPromptStage === 'choice' ? (
              <>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {state.microtaskPromptTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {state.microtaskPromptBody}
                </p>
                {state.microtaskPromptIntent === 'regenerate' ? (
                  <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                    <p className="font-semibold">
                      {state.hasRegeneratedMicroTasks || state.hasServerRegeneratedMicroTasks
                        ? 'Ліміт на перегенерацію вже використано сьогодні.'
                        : 'Перегенерацію можна використати лише один раз на день.'}
                    </p>
                    <p className="mt-1 text-amber-50/85">
                      {state.hasRegeneratedMicroTasks || state.hasServerRegeneratedMicroTasks
                        ? 'Новий аналіз на сьогодні більше недоступний. Можеш працювати з поточним списком або відредагувати його вручну.'
                        : 'Вона замінює тільки авто-завдання цього дня і після використання стане недоступною до завтра.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-white/45">
                    Якщо напишеш свої завдання, авто-завдання цього дня буде замінено новим списком.
                  </p>
                )}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
                    disabled={
                      state.microtaskPromptIntent === 'regenerate'
                        ? (state.isRegeneratingMicroTasks || state.hasRegeneratedMicroTasks || state.hasServerRegeneratedMicroTasks)
                        : state.isGeneratingMicroTasks
                    }
                    onClick={() => {
                      if (state.microtaskPromptIntent === 'regenerate') {
                        void state.handleRegenerateMicroTasks()
                        return
                      }
                      void state.handleGenerateMicroTasks()
                    }}
                  >
                    {state.microtaskPromptIntent === 'regenerate'
                      ? (state.hasRegeneratedMicroTasks || state.hasServerRegeneratedMicroTasks
                        ? 'Ліміт уже використано'
                        : state.isRegeneratingMicroTasks
                          ? 'Оновлюємо список...'
                          : 'Перегенерувати 1 раз')
                      : (state.isGeneratingMicroTasks ? 'Генеруємо...' : 'Згенерувати')}
                  </button>
                  <button
                    type="button"
                    className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
                    onClick={state.openEditMicrotaskList}
                  >
                    Редагувати список
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  Редагувати список завдань
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Кожен рядок стане окремим завданням. Після збереження поточний список цього дня буде повністю замінено.
                </p>
                <textarea
                  value={state.manualTaskText}
                  onChange={event => state.setManualTaskText(event.target.value)}
                  placeholder={'1. Закрити одну ключову дію\n2. Дописати важливий лист\n3. Повернутись до вечірньої рефлексії'}
                  className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-[rgba(var(--accent-rgb),0.4)]"
                />
                <p className="mt-2 text-xs text-white/45">
                  Один рядок = одне завдання. Старий список цього дня буде замінено без дублювання.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
                    onClick={state.handleSaveManualTask}
                    disabled={!state.manualTaskText.trim()}
                  >
                    Зберегти
                  </button>
                  <button
                    type="button"
                    className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
                    onClick={() => {
                      state.setManualTaskText(state.visibleMicroTasks.length > 0 ? state.serializeVisibleMicroTaskList() : '')
                      state.setMicrotaskPromptStage('choice')
                    }}
                  >
                    Назад
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {state.isPausedTrial ? (
        <div className="dashboard-liquid-card--soft p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
            Мікрозавдання · Пауза
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            Нові завдання зараз не формуються
          </p>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Trial уже завершився, тому новий денний цикл і мікрозавдання не запускаються. Твої звіти й минула історія при цьому лишаються доступними.
          </p>
          <div className="dashboard-card-actions mt-5">
            <button
              type="button"
              className="btn-liquid-dashboard btn-liquid-dashboard--ice"
              onClick={state.openReportsTab}
            >
              Перейти до звітів
            </button>
            <button
              type="button"
              className="btn-liquid-dashboard btn-liquid-dashboard--primary"
              onClick={() => state.setIsExpiredTrialModalOpen(true)}
            >
              Відновити доступ
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.9),rgba(10,18,36,0.95))] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
              Дата циклу
            </p>
            <p className="mt-2 text-base font-semibold text-white">
              {state.activeMicrotaskDateLabel}
            </p>
          </div>
          <div
            data-testid="day-progress"
            className="grid gap-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.9),rgba(10,18,36,0.95))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div className="flex flex-wrap items-center gap-3">
              {state.taskDaySteps.map((step) => (
                <div
                  key={step.id}
                  className={[
                    'inline-flex min-h-[48px] items-center gap-2 rounded-[16px] border px-4 py-2 text-sm font-semibold transition-colors',
                    step.status === 'done'
                      ? 'border-emerald-400/25 bg-emerald-400/12 text-emerald-300'
                      : step.status === 'active'
                        ? 'border-[#4B8DFF]/40 bg-[#4B8DFF]/12 text-[#8CB8FF]'
                        : 'border-white/10 bg-white/5 text-white/30',
                  ].join(' ')}
                >
                  <span>{step.status === 'done' ? '✓' : step.status === 'active' ? '▶' : '🔒'}</span>
                  {step.label}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-5 lg:justify-end">
              <div className="text-right">
                <p className="text-[2rem] font-black leading-none text-[#F2B24B]">+{state.taskXpToday}</p>
                <p className="mt-1 text-sm font-semibold text-white/45">XP сьогодні</p>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center">
                <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
                  <circle cx="20" cy="20" r={state.taskRingRadius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle
                    cx="20"
                    cy="20"
                    r={state.taskRingRadius}
                    fill="none"
                    stroke="#378ADD"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={state.taskRingCircumference}
                    strokeDashoffset={state.taskRingOffset}
                  />
                </svg>
                <span className="absolute text-sm font-bold text-white">{state.taskProgressPercent}%</span>
              </div>
            </div>
          </div>

          {state.isRecoveryMicrotaskDate ? (
            <>
              <div className="rounded-[20px] border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-[#F6D78E]">
                Дозавершення вчорашнього дня: тут лишаються тільки твої власні мікродії. AI-завдання і перегенерація для вчора не використовуються.
              </div>

              <RecoveryMicrotasksPanel
                dateLabel={state.activeMicrotaskDateLabel}
                tasks={recoveryTasks}
                onAddTask={state.openManualTaskComposer}
                onCompleteTask={state.handleCompleteMicroTask}
                onSkipTask={state.handleSkipMicroTask}
                onContinueToEvening={state.openEveningSession}
              />
            </>
          ) : !state.hasTasksToday ? (
            <div className="dashboard-liquid-card--soft p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
                Мікрозавдання на сьогодні
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Найчастіше це одне завдання на день
              </p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Іноді система запропонує два. Також ти завжди можеш відредагувати список вручну.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="btn-liquid-dashboard btn-liquid-dashboard--primary"
                  onClick={() => state.openMicrotaskPrompt('generate')}
                  disabled={state.isGeneratingMicroTasks}
                >
                  {state.isGeneratingMicroTasks ? 'Генеруємо...' : 'Згенерувати'}
                </button>
                <button
                  type="button"
                  className="btn-liquid-dashboard btn-liquid-dashboard--ice"
                  onClick={state.openManualTaskComposer}
                >
                  Редагувати список
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                data-testid="ai-banner"
                className="ai-banner grid gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,32,54,0.9),rgba(10,18,36,0.95))] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span className="mt-1 inline-flex h-3 w-3 flex-shrink-0 rounded-full bg-[#378ADD] shadow-[0_0_0_6px_rgba(55,138,221,0.14)]" />
                  <p className="text-base font-medium leading-7 text-white">
                    AI сформував <strong>{state.visibleMicroTasks.length} завдання</strong> на основі ранкової рефлексії
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="regen-btn"
                  className="btn-liquid-dashboard btn-liquid-dashboard--ice w-full sm:w-auto"
                  onClick={() => state.openMicrotaskPrompt('regenerate')}
                  disabled={!state.canRegenerateTasks}
                >
                  ↺ Перегенерувати
                </button>
              </div>
              {state.isRegeneratingMicroTasks ? (
                <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.22)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.11),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center gap-3">
                    <RefreshCcw className="h-4 w-4 animate-spin text-[rgb(var(--accent-soft-rgb))]" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Мікрозавдання генеруються...
                      </p>
                      <p className="text-xs text-white/45">
                        Оновлюємо існуючі задачі без дублювання і одразу відкриємо новий список.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {state.hasRegeneratedMicroTasks || state.hasServerRegeneratedMicroTasks ? (
                <div className="grid gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-amber-50">Перегенерацію вже використано</p>
                    <p className="mt-1 text-xs text-amber-50/85">
                      На сьогодні новий автоматичний список більше недоступний. Можеш працювати з цими завданнями або відредагувати список вручну.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-liquid-dashboard btn-liquid-dashboard--ice w-full sm:w-auto"
                    onClick={state.openEditMicrotaskList}
                  >
                    Редагувати список
                  </button>
                </div>
              ) : null}
              <div className={state.isRegeneratingMicroTasks ? 'pointer-events-none opacity-60' : ''}>
                <MicroTaskList
                  tasks={state.visibleMicroTasks}
                  isLoading={state.isFetchingMicroTasks}
                  activeEmptyText="Задачі ще формуються AI після ранкової сесії"
                  xpBadgeText={`⭐ +${state.taskXpToday} XP сьогодні`}
                  onComplete={state.handleCompleteMicroTask}
                  onDelete={(taskId) => {
                    void state.deleteTask(taskId)
                  }}
                  onSkip={state.handleSkipMicroTask}
                  onSetProgress={(taskId, progressPercent) => {
                    void state.updateProgress(taskId, progressPercent)
                  }}
                  onToggleStep={(taskId, stepIndex, done) => {
                    const manual = state.visibleMicroTasks.find(task => task.id === taskId && task.status === 'manual')
                    if (manual) {
                      const nextSteps = Array.isArray(manual.stepsCompleted) ? [...manual.stepsCompleted] : []
                      nextSteps[stepIndex] = done
                      const updated: MicroTaskItem = {
                        ...manual,
                        stepsCompleted: nextSteps,
                      }
                      state.setManualMicroTask(updated)
                      state.saveVisibleManualTask(updated)
                      return
                    }
                    void state.updateStep(taskId, stepIndex, done)
                  }}
                  onEdit={state.openEditMicrotaskList}
                />
              </div>
              {state.canContinueToEvening && !state.showEveningSession ? (
                <div
                  data-testid="next-step-cta"
                  className={[
                    'grid gap-3 rounded-2xl px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center',
                    state.allTasksResolved
                      ? 'border border-[rgba(29,158,117,0.24)] bg-[rgba(29,158,117,0.10)]'
                      : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {state.allTasksResolved
                        ? 'Мікрозавдання зібрані. Збережи ритм.'
                        : `Ще ${state.visibleMicroTaskProgress.activeCount} завдань чекають завершення.`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {state.allTasksResolved
                        ? 'Заверши день вечірньою сесією і отримай AI-аналіз.'
                        : 'Закрий або пропусти активні завдання, щоб перейти до вечірньої сесії.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={[
                      'btn-liquid-dashboard w-full sm:w-auto',
                      state.allTasksResolved
                        ? 'btn-liquid-dashboard--primary'
                        : 'btn-liquid-dashboard--ice opacity-70',
                    ].join(' ')}
                    onClick={state.openEveningSession}
                    disabled={!state.allTasksResolved}
                  >
                    Перейти до вечора
                  </button>
                </div>
              ) : null}
            </>
          )}
          {!state.isRecoveryMicrotaskDate ? (
            <button
              type="button"
              data-testid="manual-task-btn"
              onClick={state.openManualTaskComposer}
              className="w-full rounded-[20px] border border-dashed border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[rgba(255,255,255,0.24)] hover:text-[var(--text-primary)]"
            >
              + Написати власне завдання
            </button>
          ) : null}
          {state.microtaskPromptStage === 'edit' ? (
            <div className="manual-form rounded-[24px]">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${state.isRecoveryMicrotaskDate ? 'text-[#F2B24B]' : 'text-[rgb(var(--accent-soft-rgb))]'}`}>
                {state.isRecoveryMicrotaskDate ? 'Своя мікродія за вчора' : 'Власне завдання'}
              </p>
              <textarea
                data-testid="manual-task-input"
                value={state.manualTaskText}
                onChange={event => state.setManualTaskText(event.target.value)}
                placeholder={state.isRecoveryMicrotaskDate ? 'Яку саме мікродію ти зробила вчора?' : 'Що конкретно потрібно зробити сьогодні?'}
                className={`mt-4 min-h-28 w-full rounded-2xl bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--text-secondary)] outline-none transition-colors placeholder:text-[var(--text-muted)] ${state.isRecoveryMicrotaskDate ? 'border border-[rgba(242,178,75,0.18)] focus:border-[rgba(242,178,75,0.34)]' : 'border border-[rgba(255,255,255,0.1)] focus:border-[rgba(var(--accent-rgb),0.3)]'}`}
                autoFocus
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
                  onClick={() => {
                    state.setManualTaskText('')
                    state.setMicrotaskPromptStage('choice')
                    state.setMicrotaskPromptIntent(null)
                  }}
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  data-testid="manual-task-save"
                  className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
                  onClick={state.handleSaveManualTask}
                  disabled={!state.manualTaskText.trim()}
                >
                  {state.isRecoveryMicrotaskDate ? 'Додати дію' : 'Зберегти'}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
