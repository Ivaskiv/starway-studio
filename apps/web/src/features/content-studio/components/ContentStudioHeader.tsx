import { InfoHint } from '@/ui'

import { SECTION_EYEBROW_CLASS } from '../config/contentStudio.config'

type Props = {
  isGenerating: boolean
  onStartNewPackage: () => void
  onGenerateAll: () => void
}

export function ContentStudioHeader({ isGenerating, onStartNewPackage, onGenerateAll }: Props) {
  return (
    <div className="dashboard-liquid-edge--top border-b border-[var(--border)] px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className={SECTION_EYEBROW_CLASS}>Контент + реклама система</p>
            <InfoHint
              label="Контент + реклама"
              description="Один генератор для Reels, реклами, Stories, podcast scripts і DM-сценаріїв з єдиною логікою прогріву та продажу."
              instruction="Онови вхідні дані, натисни Generate all, переглянь кожен блок, затверди сильні варіанти і тільки після цього публікуй."
            />
          </div>
          <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Generate → Preview → Approve → Publish</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
            Воронка одна: Reels → Profile → Stories → DM → Sale. Для реклами: Ads → Post → DM.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onStartNewPackage} className="btn-liquid-dashboard btn-liquid-dashboard--primary rounded-[18px] px-5 py-3">
            Новий пакет
          </button>
          <button type="button" onClick={onGenerateAll} disabled={isGenerating} className="btn-liquid-dashboard btn-liquid-dashboard--ice rounded-[18px] px-5 py-3 disabled:opacity-60">
            {isGenerating ? 'Збираю пакет…' : 'Зробити все автоматично'}
          </button>
        </div>
      </div>
    </div>
  )
}
