import MentorProgressContent from '@/features/progress/components/MentorProgressContent'

interface MiniAppTrackerSectionProps {
  currentDay: number
}

export default function MiniAppTrackerSection({
  currentDay,
}: MiniAppTrackerSectionProps) {
  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="sr-only">День {currentDay}</div>
      <MentorProgressContent compact />
    </div>
  )
}
