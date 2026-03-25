import { Button } from '@/ui'
import type { JournalFilter } from '../types'

interface FiltersProps {
  filter: JournalFilter
  onChange: (next: JournalFilter) => void
}

export default function Filters({ filter, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant={filter === 'all' ? 'solid' : 'glass'}
        color={filter === 'all' ? 'accent' : 'muted'}
        size="sm"
        active={filter === 'all'}
        onClick={() => onChange('all')}
      >
        All
      </Button>
      <Button
        variant={filter === 'zoom' ? 'solid' : 'glass'}
        color={filter === 'zoom' ? 'accent' : 'muted'}
        size="sm"
        active={filter === 'zoom'}
        onClick={() => onChange('zoom')}
      >
        Zoom
      </Button>
      <Button
        variant={filter === 'practices' ? 'solid' : 'glass'}
        color={filter === 'practices' ? 'accent' : 'muted'}
        size="sm"
        active={filter === 'practices'}
        onClick={() => onChange('practices')}
      >
        Практики
      </Button>
    </div>
  )
}
