import { useState } from 'react'

import { CrossChannelPreviewModal, TelegramPreview } from '@/features/content-preview'
import type { CrossChannelPreviewMode } from '@/features/content-preview'
import type { PreviewButton } from '@/features/content-preview/types'
import { BaseModal } from '@/features/modals/BaseModal'

const PREVIEW_STEPS = [
  'Рефлексія',
  'Інсайт',
  'Копірайт',
  '3 варіанти',
  'Голос',
  'Reels',
  'Telegram',
  'Публікація',
] as const

const MINIAPP_STEPS = [
  { index: 1, title: 'Контекст', subtitle: 'Автозаповнюється з даних платформи' },
  { index: 2, title: 'Сценарій', subtitle: 'На основі яких даних генеруємо' },
  { index: 3, title: 'Формула', subtitle: 'PAS / AIDA / BAB / FAB / 4P / STACK' },
  { index: 4, title: 'Дослідження', subtitle: 'Найдієвіші хуки 2025–2026' },
  { index: 5, title: 'Текст × 3', subtitle: 'Редагуй кожен — перегенеруй окремо' },
  { index: 6, title: 'Банери × 3', subtitle: 'Редагуй промпти і генеруй' },
  { index: 7, title: 'Reels', subtitle: 'ElevenLabs → Ffmpeg → TG Preview → Instagram' },
] as const

const CONTENT_MACHINE_COPY = {
  eyebrow: 'CONTENT MACHINE',
  title: 'Content Machine',
  headline: 'СТАН → REELS → ПРОДАЖ',
  subheadline: 'Дані юзерів → аналіз → голос Наді → відео → Instagram',
  description:
    'Стан → ціль → вибір → дія → інсайт → Reels → продаж. Один центр потрібен для того, щоб контент, реклама, прогрів і публікація жили в одній логіці, а не в різних хаотичних блоках.',
  flow: PREVIEW_STEPS,
  primaryAction: 'Відкрити Content Machine',
  secondaryAction: 'Як це працює',
  previewPrimaryAction: '⚡ Відкрити Content Machine',
  previewAutomationAction: '🔁 Зробити все автоматично',
  previewTelegramText: [
    '⚡ Content Machine готовий до запуску.',
    '',
    'Стан → Reels → продаж в одному модулі.',
    'Дані юзерів → аналіз → голос Наді → відео → Instagram.',
    '',
    'Відкрий модуль і продовжуй без втрати контексту.',
  ].join('\n'),
  previewTitle: 'Content Machine Preview',
  previewDescription: 'Один і той самий сценарій у Desktop, Mini App і Telegram без втрати контексту.',
} as const

const TELEGRAM_BUTTONS: PreviewButton[] = [
  { label: 'Відкрити Content Machine', tone: 'primary' },
  { label: 'Зробити все автоматично', tone: 'secondary' },
  { label: 'Відкрити Mini App', tone: 'ghost' },
]

function formatRoleBadge(role: string) {
  if (role === 'SUPERADMIN') return 'SuperAdmin'
  if (role === 'ADMIN') return 'Admin'
  return 'Expert'
}

export function DesktopPreview() {
  return (
    <div className="rounded-[30px] border border-[rgba(68,96,174,0.3)] bg-[linear-gradient(180deg,rgba(53,74,140,0.96),rgba(14,18,33,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_64px_rgba(0,0,0,0.42)]">
      <div className="rounded-[24px] border border-[rgba(92,119,189,0.22)] bg-[linear-gradient(180deg,rgba(14,19,34,0.66),rgba(12,16,29,0.92))] px-5 py-6 backdrop-blur-xl">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.38em] text-[rgb(104,146,226)]">
          {CONTENT_MACHINE_COPY.title}
        </p>
        <h3 className="mt-4 text-center text-[2rem] font-semibold tracking-tight text-[var(--text-primary)]">
          {CONTENT_MACHINE_COPY.headline}
        </h3>
        <p className="mx-auto mt-4 max-w-[760px] text-center text-[15px] leading-7 text-[var(--text-secondary)]">
          {CONTENT_MACHINE_COPY.subheadline}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {PREVIEW_STEPS.map((step, index) => (
            <div
              key={step}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(92,119,189,0.18)] bg-[rgba(255,255,255,0.035)] px-4 py-2 text-sm font-medium text-[rgba(197,206,232,0.84)]"
            >
              <span className="text-[rgb(104,146,226)]">{step}</span>
              {index < PREVIEW_STEPS.length - 1 ? (
                <span className="text-[rgba(170,180,205,0.52)]">→</span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-[820px] flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-[18px] border border-[rgba(121,145,209,0.4)] bg-[linear-gradient(180deg,rgba(108,129,191,0.96),rgba(63,86,139,0.94))] px-5 py-4 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_36px_rgba(11,17,32,0.28)]"
          >
            {CONTENT_MACHINE_COPY.previewPrimaryAction}
          </button>
          <button
            type="button"
            className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(27,34,48,0.96),rgba(15,19,28,0.98))] px-5 py-4 text-base font-semibold text-[rgba(225,231,241,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.2)]"
          >
            {CONTENT_MACHINE_COPY.previewAutomationAction}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MiniAppPreview({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[36px] border border-[rgba(72,94,160,0.3)] bg-[linear-gradient(180deg,rgba(7,10,18,0.98),rgba(11,15,26,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_72px_rgba(0,0,0,0.5)]">
      <div className="rounded-[28px] border border-[rgba(92,119,189,0.2)] bg-[rgba(15,19,31,0.94)] pt-4">
        <div className="mx-auto h-3 w-3 rounded-full border border-[rgba(139,161,214,0.18)] bg-[rgba(255,255,255,0.03)]" />
        <div className="mt-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-5 pb-4">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">
            ⭐ Starway <span className="font-medium text-[var(--text-muted)]">Content Machine</span>
          </p>
          <span className="rounded-full border border-[rgba(111,140,224,0.2)] bg-[rgba(59,79,128,0.32)] px-3 py-1 text-xs font-semibold text-[rgb(178,196,255)]">
            {roleLabel}
          </span>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[24px] border border-[rgba(92,119,189,0.18)] bg-[linear-gradient(180deg,rgba(22,29,48,0.9),rgba(18,23,37,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(104,146,226)]">
              ⚡ {CONTENT_MACHINE_COPY.title}
            </p>
            <h3 className="mt-3 text-[1.8rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
              {CONTENT_MACHINE_COPY.headline}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              {CONTENT_MACHINE_COPY.subheadline}
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                className="w-full rounded-[16px] border border-[rgba(121,145,209,0.4)] bg-[linear-gradient(180deg,rgba(108,129,191,0.96),rgba(63,86,139,0.94))] px-4 py-3 text-[15px] font-semibold text-white"
              >
                {CONTENT_MACHINE_COPY.previewPrimaryAction}
              </button>
              <button
                type="button"
                className="w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(27,34,48,0.96),rgba(15,19,28,0.98))] px-4 py-3 text-[15px] font-semibold text-[rgba(225,231,241,0.9)]"
              >
                {CONTENT_MACHINE_COPY.previewAutomationAction}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Кроки
            </p>
            {MINIAPP_STEPS.map((step) => (
              <div
                key={step.index}
                className="flex items-center gap-3 rounded-[18px] border border-[rgba(92,119,189,0.16)] bg-[rgba(18,24,39,0.74)] px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(111,140,224,0.24)] text-xs font-semibold text-[rgb(178,196,255)]">
                  {step.index}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{step.subtitle}</p>
                </div>
                <span className="ml-auto text-[var(--text-muted)]">›</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 border-t border-[rgba(255,255,255,0.07)] bg-[rgba(12,16,27,0.96)] px-3 py-3 text-center text-[11px] text-[var(--text-muted)]">
          {['🏠', '🤖', '✍️', '💎', '👤'].map((icon, index) => (
            <div
              key={`${icon}-${index}`}
              className={[
                'mx-1 rounded-[14px] px-2 py-2',
                index === 2
                  ? 'border border-[rgba(111,140,224,0.22)] bg-[rgba(59,79,128,0.24)] text-[var(--text-primary)]'
                  : '',
              ].join(' ')}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TelegramModulePreview() {
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <TelegramPreview
        text={CONTENT_MACHINE_COPY.previewTelegramText}
        buttons={TELEGRAM_BUTTONS}
        status="ready"
      />
    </div>
  )
}

export default function ContentMachinePreviewCard({
  currentRole,
}: {
  currentRole: string
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<CrossChannelPreviewMode>('miniapp')
  const roleLabel = formatRoleBadge(currentRole)

  return (
    <div className="dashboard-liquid-card overflow-hidden">
      <div className="dashboard-liquid-edge--top px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[rgb(104,146,226)]">
            {CONTENT_MACHINE_COPY.eyebrow}
          </p>
          <h2 className="mt-5 text-[2.8rem] font-semibold tracking-tight text-[var(--text-primary)] md:text-[3.2rem]">
            {CONTENT_MACHINE_COPY.title}
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-[15px] leading-8 text-[var(--text-secondary)] md:text-[16px]">
            {CONTENT_MACHINE_COPY.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {CONTENT_MACHINE_COPY.flow.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[rgb(104,146,226)]">{step}</span>
                {index < CONTENT_MACHINE_COPY.flow.length - 1 ? (
                  <span className="text-[13px] text-[rgba(170,180,205,0.7)]">→</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-9 flex w-full max-w-[820px] flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setPreviewMode('miniapp')
                setIsPreviewOpen(true)
              }}
              className="w-full rounded-[20px] border border-[rgba(121,145,209,0.42)] bg-[linear-gradient(180deg,rgba(111,128,157,0.96),rgba(54,72,115,0.98))] px-6 py-4 text-[16px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_34px_rgba(11,17,32,0.26)] transition-transform hover:translate-y-[-1px]"
            >
              {CONTENT_MACHINE_COPY.primaryAction}
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="w-full rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(26,31,41,0.98),rgba(16,20,28,0.98))] px-6 py-4 text-[16px] font-semibold text-[rgba(214,221,236,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.18)] transition-transform hover:translate-y-[-1px]"
            >
              {CONTENT_MACHINE_COPY.secondaryAction}
            </button>
          </div>
        </div>
      </div>

      <CrossChannelPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={CONTENT_MACHINE_COPY.previewTitle}
        description={CONTENT_MACHINE_COPY.previewDescription}
        mode={previewMode}
        onModeChange={setPreviewMode}
        moduleName={CONTENT_MACHINE_COPY.title}
        desktop={<DesktopPreview />}
        miniApp={<MiniAppPreview roleLabel={roleLabel} />}
        telegram={<TelegramModulePreview />}
      />

      <BaseModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        overlayClassName="bg-black/85"
        containerClassName="items-start pt-4 sm:pt-8"
        panelClassName="max-w-3xl rounded-[28px] border border-[rgba(72,94,160,0.35)] bg-[rgba(8,11,19,0.98)] p-0 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
      >
        <div className="overflow-hidden rounded-[28px]">
          <div className="dashboard-liquid-edge--top flex items-start justify-between gap-4 border-b border-[rgba(92,119,189,0.18)] px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(104,146,226)]">
                Content Machine
              </p>
              <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--text-primary)]">
                Як працювати з Starway · Content Machine
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Цей модуль доцільний тим, що збирає весь production flow в один маршрут: від стану й оферу до реклами, Reels і продажу.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Закрити
            </button>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-4">
              {[
                { title: '1. Зафіксуй вхід', text: 'Опиши стан, тему й офер. Це дає системі контекст для точніших сценаріїв і реклами.' },
                { title: '2. Переглянь і підтвердь', text: 'У вкладці сценаріїв ти одразу бачиш Reels, Ads, Stories і DM. Залишай тільки сильні варіанти.' },
                { title: '3. Запусти Reels pipeline', text: 'Окремий guided pipeline веде від голосу до review і черги без перевантаження основного екрана.' },
                { title: '4. Публікуй через один центр', text: 'Telegram, planner і наступні дії для прогріву живуть в одному місці, тому контент і реклама не розлітаються.' },
              ].map((step, index) => (
                <div key={step.title} className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(111,140,224,0.18)] bg-[rgba(59,79,128,0.18)] text-sm font-semibold text-[rgb(178,196,255)]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-[var(--text-primary)]">{step.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BaseModal>
    </div>
  )
}
