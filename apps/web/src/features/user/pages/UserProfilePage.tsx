// frontend/src/features/user/pages/UserProfilePage.tsx
import { useState }        from 'react'
import ProfileHero         from '@/features/user/components/ProfileHero'
import ProfileTabs         from '@/features/user/components/ProfileTabs'
import ProfileOverview     from '@/features/user/components/ProfileOverview'
import ProfileHistory      from '@/features/user/components/ProfileHistory'
import ProfileBadges       from '@/features/user/components/ProfileBadges'
import SettingsPage        from '@/features/settings/pages/SettingsPage'
import { PROFILE_TABS }    from '@/features/user/types/user.types'
import type { ProfileTab } from '@/features/user/types/user.types'

export default function UserProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('overview')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <ProfileHero />
      <ProfileTabs
        tabs={PROFILE_TABS}
        active={tab}
        onChange={tabId => setTab(tabId as ProfileTab)}
      />

      {tab === 'overview'  && <ProfileOverview />}
      {tab === 'history'   && <ProfileHistory  />}
      {tab === 'badges'    && <ProfileBadges   />}
      {tab === 'settings'  && <SettingsPage    />}
    </div>
  )
}
