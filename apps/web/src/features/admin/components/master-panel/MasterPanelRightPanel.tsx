import type { ReactNode } from 'react'

import { Badge, Button, InfoHint } from '@/ui'

export type RightPanelContext =
  | { type: 'prompt'; promptId: string }
  | { type: 'notification'; notificationId: string }
  | { type: 'funnelScreen'; screenId: string; funnelId: string }

export interface MasterPanelRightPanelDependency {
  name: string
  severity: 'high' | 'medium' | 'low'
  reason: string
  relatedItems?: string[]
}

export interface MasterPanelRightPanelCheck {
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
}

export interface MasterPanelRightPanelWarning {
  title?: string
  body: string
  tone: 'info' | 'warning' | 'success'
}

interface MasterPanelRightPanelAction {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

function toneVariant(tone: 'info' | 'warning' | 'success') {
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}

function toneDotClass(tone: 'info' | 'warning' | 'success') {
  if (tone === 'warning') return 'bg-[var(--color-text-warning)]'
  if (tone === 'success') return 'bg-[var(--color-text-success)]'
  return 'bg-[var(--color-text-info)]'
}

function severityLabel(severity: 'high' | 'medium' | 'low') {
  if (severity === 'high') return 'Високий'
  if (severity === 'medium') return 'Середній'
  return 'Низький'
}

function tonePanelClass(tone: 'info' | 'warning' | 'success') {
  if (tone === 'warning') {
    return 'border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)]'
  }
  if (tone === 'success') {
    return 'border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)]'
  }
  return 'border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.08)]'
}

function contextLabel(context: RightPanelContext) {
  if (context.type === 'prompt') return 'Промпт'
  if (context.type === 'notification') return 'Нагадування'
  return 'Екран воронки'
}

export default function MasterPanelRightPanel({
  context,
  title,
  summary,
  hintDescription,
  hintInstruction,
  supplementalContent,
  topAction,
  linkedAction,
  dependencies,
  warnings,
  checks,
  checksState = 'idle',
  recommendation,
  footerAction,
}: {
  context: RightPanelContext
  title: string
  summary: string
  hintDescription: string
  hintInstruction: string
  supplementalContent?: ReactNode
  topAction?: MasterPanelRightPanelAction
  linkedAction?: MasterPanelRightPanelAction
  dependencies: MasterPanelRightPanelDependency[]
  warnings: MasterPanelRightPanelWarning[]
  checks: MasterPanelRightPanelCheck[]
  checksState?: 'idle' | 'loading' | 'ready' | 'error'
  recommendation?: string
  footerAction: MasterPanelRightPanelAction
}) {
  return (
    <aside className="h-fit overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-[1.55rem] font-semibold leading-tight text-[var(--text-primary)]">{title}</h2>
          <Badge variant="info" size="sm">
            {contextLabel(context)}
          </Badge>
          <InfoHint label="Right panel" description={hintDescription} instruction={hintInstruction} />
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{summary}</p>

        {topAction || linkedAction ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {topAction ? (
              <Button
                type="button"
                variant="solid"
                color="accent"
                size="sm"
                loading={topAction.loading}
                loadingText="Обробляємо…"
                disabled={topAction.disabled}
                onClick={topAction.onClick}
              >
                {topAction.label}
              </Button>
            ) : null}
            {linkedAction ? (
              <Button
                type="button"
                variant="glass"
                color="accent"
                size="sm"
                disabled={linkedAction.disabled}
                onClick={linkedAction.onClick}
              >
                {linkedAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}

        {supplementalContent ? <div className="mt-4">{supplementalContent}</div> : null}

        <div className="mt-4 space-y-4">
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Аналіз впливу
            </p>
            {dependencies.length ? (
              dependencies.map((dependency) => (
                <div key={dependency.name} className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        dependency.severity === 'high'
                          ? 'error'
                          : dependency.severity === 'medium'
                            ? 'warning'
                            : 'success'
                      }
                      size="sm"
                    >
                      {severityLabel(dependency.severity)}
                    </Badge>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{dependency.name}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{dependency.reason}</p>
                  {dependency.relatedItems?.length ? (
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      Пов'язано: {dependency.relatedItems.join(' · ')}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                Поки що залежності не виявлені.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Попередження
            </p>
            {warnings.length ? (
              warnings.map((warning, index) => (
                <div key={`${warning.title ?? 'warning'}-${index}`} className={['rounded-[20px] border px-4 py-4', tonePanelClass(warning.tone)].join(' ')}>
                  {warning.title ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={toneVariant(warning.tone)} size="sm">
                        {warning.tone === 'warning' ? 'Увага' : warning.tone === 'success' ? 'OK' : 'Info'}
                      </Badge>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{warning.title}</p>
                    </div>
                  ) : null}
                  <p className={warning.title ? 'mt-2 text-sm leading-6 text-[var(--text-muted)]' : 'text-sm leading-6 text-[var(--text-muted)]'}>
                    {warning.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                Попереджень поки немає.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
              AI-перевірка
            </p>
            {checks.length ? (
              checks.map((check) => (
                <div key={check.title} className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                        toneDotClass(check.tone),
                      ].join(' ')}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{check.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{check.body}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                {checksState === 'loading'
                  ? 'Формуємо AI-перевірку…'
                  : checksState === 'error'
                    ? 'Не вдалося виконати AI-перевірку. Спробуй ще раз.'
                    : 'Перевірка не запущена.'}
              </div>
            )}
          </section>

          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Рекомендація
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
              {recommendation ?? 'Збережи зміни після перевірки всіх залежностей і попереджень.'}
            </p>
          </div>

          <Button
            type="button"
            variant="solid"
            color="accent"
            size="md"
            className="w-full"
            loading={footerAction.loading}
            loadingText="Зберігаємо…"
            disabled={footerAction.disabled}
            onClick={footerAction.onClick}
          >
            {footerAction.label}
          </Button>
        </div>
      </div>
    </aside>
  )
}
