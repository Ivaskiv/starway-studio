export function PreparationModal({
  answer,
  error,
  isSubmitting,
  onChange,
  onCancel,
  onConfirm,
}: {
  answer: string;
  error: string | null;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрити підготовку до Zoom"
        onClick={onCancel}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Підготовка до Zoom</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Що ти вже пробувала зробити?</h3>
        </div>

        <div className="space-y-4 px-4 py-4">
          <textarea
            value={answer}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Коротко опиши, що вже пробувала"
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
          />
          {error ? (
            <p className="text-sm text-amber-300">{error}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-50"
            >
              {isSubmitting ? 'Зберігаємо...' : 'Підтвердити'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Скасувати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SessionDetailCard ─────────────────────────────────────────────────────────
