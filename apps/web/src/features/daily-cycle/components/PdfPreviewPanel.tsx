import { REPORT_ACTION_CLASS, REPORT_ACTION_SECONDARY_CLASS, SECTION_EYEBROW_CLASS } from '@/features/daily-cycle/types/reportsTab.constants'

type Props = {
  pdfPreviewUrl: string
  pdfPreviewTitle: string
  onClose: () => void
}

export function PdfPreviewPanel({ pdfPreviewUrl, pdfPreviewTitle, onClose }: Props) {
  return (
    <div className="dashboard-liquid-card--soft overflow-hidden">
      <div className="dashboard-liquid-edge--top flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className={SECTION_EYEBROW_CLASS}>PDF звіт</p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{pdfPreviewTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={REPORT_ACTION_CLASS}
            onClick={() => {
              const anchor = document.createElement('a')
              anchor.href = pdfPreviewUrl
              anchor.download = `starway-report-${new Date().toISOString().slice(0, 10)}.pdf`
              anchor.click()
            }}
          >
            Завантажити PDF
          </button>
          <button type="button" className={REPORT_ACTION_SECONDARY_CLASS} onClick={onClose}>
            Закрити перегляд
          </button>
        </div>
      </div>
      <div className="bg-white p-3">
        <iframe src={pdfPreviewUrl} title={pdfPreviewTitle} className="min-h-[900px] w-full rounded-[18px] border-0 bg-white" />
      </div>
    </div>
  )
}
