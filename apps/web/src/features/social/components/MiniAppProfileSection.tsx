import AccountCabinetContent from '@/features/user/components/AccountCabinetContent'

interface MiniAppProfileSectionProps {
  displayName: string
}

export default function MiniAppProfileSection({
  displayName,
}: MiniAppProfileSectionProps) {
  return (
    <div className="space-y-5 px-4 pt-6">
      <div className="sr-only">{displayName}</div>
      <AccountCabinetContent compact />
    </div>
  )
}
