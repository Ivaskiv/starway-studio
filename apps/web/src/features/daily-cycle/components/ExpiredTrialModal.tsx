import { X } from 'lucide-react'

import { BaseModal } from '@/features/modals/BaseModal'

type ExpiredTrialModalProps = {
  isOpen: boolean
  onClose: () => void
  onOpenSubscription: () => void
  onOpenReports: () => void
}

export default function ExpiredTrialModal({
  isOpen,
  onClose,
  onOpenSubscription,
  onOpenReports,
}: ExpiredTrialModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-[rgba(4,8,16,0.84)]"
      containerClassName="z-[95]"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] transition-all hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
          aria-label="Закрити модальне вікно"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
          ABsystem · Trial завершився
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
          Історія збережена, активний цикл поставлено на паузу
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Ранкові й вечірні сесії, мікрозавдання та живий ABsystem зараз заблоковані, бо пробний період уже завершився.
          Але твої звіти, історія за 7 днів і вже сформовані інсайти нікуди не зникли.
        </p>

        <div className="mt-5 rounded-[22px] border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Що можна зробити зараз</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            <li>• Відкрити звіти й подивитися весь шлях, який уже пройдено.</li>
            <li>• Обрати підписку, щоб продовжити цикл без втрати контексту.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOpenReports}
            className="btn-liquid-dashboard btn-liquid-dashboard--ice flex-1"
          >
            Відкрити звіти
          </button>
          <button
            type="button"
            onClick={onOpenSubscription}
            className="btn-liquid-dashboard btn-liquid-dashboard--primary flex-1"
          >
            Обрати підписку
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
