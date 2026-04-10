import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type BottomNavTab = 'home' | 'library' | 'ai' | 'tracker' | 'profile'

export interface BottomNavProps {
  activeTab: BottomNavTab
  onTabChange: (tab: BottomNavTab) => void
}

type NavItem = {
  id: BottomNavTab
  label: string
  Icon: () => ReactNode
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M3.75 10.75 12 4l8.25 6.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 9.75v8.5a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1v-8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 19.25v-5a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M6.25 5.25h7.25a2 2 0 0 1 2 2v10.5H8.25a2 2 0 0 0-2 2V5.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 7.25h2.25A1.75 1.75 0 0 1 19.5 9v10.75h-9.25a2 2 0 0 1-2-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M9 9.25h4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 3.5 13.75 8.25 18.5 10 13.75 11.75 12 16.5 10.25 11.75 5.5 10l4.75-1.75L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.25 4.75 18.8 6.2l1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45ZM6.25 15.6l.65 1.65 1.65.65-1.65.65-.65 1.65-.65-1.65-1.65-.65 1.65-.65.65-1.65Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.56"
      />
    </svg>
  )
}

function TrackerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="m12 3.75 6.75 5.5L12 20.25 5.25 9.25 12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m12 3.75 2.8 5.5L12 20.25 9.2 9.25 12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.82"
      />
      <path
        d="M5.25 9.25h13.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.42"
      />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 12.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.25a7.5 7.5 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Головна', Icon: HomeIcon },
  { id: 'library', label: 'Бібліотека', Icon: LibraryIcon },
  { id: 'ai', label: 'Асистент', Icon: AIIcon },
  { id: 'tracker', label: 'Трекер', Icon: TrackerIcon },
  { id: 'profile', label: 'Я', Icon: ProfileIcon },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="miniapp-bottomnav-shell" aria-label="Mini App navigation">
      <div className="miniapp-bottomnav">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'miniapp-bottomnav__item group',
                active && 'miniapp-bottomnav__item--active',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'miniapp-bottomnav__icon btn-icon',
                  id === 'ai' && active && 'miniapp-bottomnav__icon--pulse',
                )}
                aria-hidden="true"
              >
                <Icon />
              </span>
              <span className="miniapp-bottomnav__label">{label}</span>
              <span
                className={cn(
                  'miniapp-bottomnav__dot',
                  active && 'miniapp-bottomnav__dot--active',
                )}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
