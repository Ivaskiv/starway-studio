import { battleInstructionContent } from './battleInstruction.content'

export function BattleInstruction({
  onClose,
}: {
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрити правила Zoom Battle"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-instruction-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 id="battle-instruction-title" className="text-base font-semibold text-white">
            {battleInstructionContent.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            Закрити
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 pb-8">
          <div className="space-y-4">
            {battleInstructionContent.sections.map((section) => (
              <section key={section.heading} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--accent-rgb))]">
                  {section.heading}
                </h4>
                {'body' in section && (
                  <p className="text-sm leading-6 text-white/70">{section.body}</p>
                )}
                {'items' in section && (
                  <ol className="space-y-2 pl-5 text-sm leading-6 text-white/70">
                    {section.items.map((item) => (
                      <li key={item} className="list-decimal">
                        {item}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
