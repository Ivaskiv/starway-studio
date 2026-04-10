import { PencilLine, Plus, Trash2 } from 'lucide-react'

import { InfoHint } from '@/ui'
import type { LeadMagnet } from '../../types/contentStudio.types'

export function LeadMagnetEditor({
  leadMagnet,
  onChange,
}: {
  leadMagnet: LeadMagnet
  onChange: (next: LeadMagnet) => void
}) {
  const update = (patch: Partial<LeadMagnet>) => onChange({ ...leadMagnet, ...patch })
  const updateStructure = (patch: Partial<LeadMagnet['structure']>) => update({ structure: { ...leadMagnet.structure, ...patch } })

  return (
    <div className="space-y-4 rounded-[22px] border border-[rgba(250,204,21,0.16)] bg-[rgba(255,255,255,0.025)] p-4">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(250,204,21)]">Lead Magnet Editor</p>
        <InfoHint label="Lead Magnet Editor" description="Тут можна редагувати весь лідмагніт вручну." instruction="Підлаштуй title, promise, hook, explanation, steps, result і перехід у продукт. Кожне поле впливає на preview та publish payload." />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Title</span><PencilLine className="h-3.5 w-3.5 text-[rgb(250,204,21)]" /></div>
          <input value={leadMagnet.title} onChange={(event) => update({ title: event.target.value })} className="w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Promise</span><InfoHint label="Promise" description="Обіцянка лідмагніту" instruction="Обіцянка має бути швидкою й конкретною. Краще до 10 хвилин, без AI-води." /></div>
          <input value={leadMagnet.promise} onChange={(event) => update({ promise: event.target.value })} className="w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Hook</span></div>
          <textarea value={leadMagnet.structure.hook} onChange={(event) => updateStructure({ hook: event.target.value })} className="min-h-[92px] w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Explanation</span></div>
          <textarea value={leadMagnet.structure.explanation} onChange={(event) => updateStructure({ explanation: event.target.value })} className="min-h-[92px] w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">Steps</p>
          <button type="button" onClick={() => updateStructure({ steps: [...leadMagnet.structure.steps, ''] })} className="inline-flex items-center gap-1 rounded-full border border-[rgba(250,204,21,0.22)] bg-[rgba(250,204,21,0.08)] px-3 py-1.5 text-xs font-semibold text-[rgb(250,204,21)]">
            <Plus className="h-3.5 w-3.5" />
            Додати крок
          </button>
        </div>
        <div className="space-y-2">
          {leadMagnet.structure.steps.map((step, index) => (
            <div key={`${index}-${step}`} className="flex items-center gap-2">
              <input value={step} onChange={(event) => {
                const next = [...leadMagnet.structure.steps]
                next[index] = event.target.value
                updateStructure({ steps: next })
              }} className="flex-1 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
              <button type="button" onClick={() => updateStructure({ steps: leadMagnet.structure.steps.filter((_, stepIndex) => stepIndex !== index) })} className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Result</span></div>
          <textarea value={leadMagnet.structure.result} onChange={(event) => updateStructure({ result: event.target.value })} className="min-h-[86px] w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><span>Transition to product</span></div>
          <textarea value={leadMagnet.structure.transitionToProduct} onChange={(event) => updateStructure({ transitionToProduct: event.target.value })} className="min-h-[86px] w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none" />
        </label>
      </div>
    </div>
  )
}
