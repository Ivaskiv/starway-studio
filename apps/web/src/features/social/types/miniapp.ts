export type MiniAppPageId = 'home' | 'mentor' | 'tracker' | 'library' | 'profile'

export type MiniAppChatRole = 'user' | 'ai'

export type MiniAppChatMessage = {
  role: MiniAppChatRole
  text: string
}

export type MiniAppTrackerItem = {
  id: string
  label: string
  value: number
}

export type MiniAppLibraryItem = {
  title: string
  sub: string
  locked: boolean
}
