import AccountCabinetContent from '@/features/user/components/AccountCabinetContent'
import { ProfileTabPanel } from '@/features/user/components/ProfileTabs'

export default function ProfileOverview() {
  return (
    <ProfileTabPanel className="p-0">
      <AccountCabinetContent />
    </ProfileTabPanel>
  )
}
