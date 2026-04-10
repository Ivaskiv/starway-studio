import type { PreviewStatus } from './types'

const LABELS: Record<PreviewStatus, string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  published: 'Published',
}

export function PreviewStatusBadge({ status }: { status: PreviewStatus }) {
  return (
    <span className={`cp-status cp-status--${status}`}>
      {LABELS[status]}
    </span>
  )
}
