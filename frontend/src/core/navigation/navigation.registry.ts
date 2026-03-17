export type NavPage = {
  id:           string
  label:        string
  icon?:        string
  description?: string
  path:         string
}

export type NavGroup = {
  id:    string
  title: string
  color: string   
  pages: NavPage[]
}

export type NavMenu = {
  id:      string
  label:   string
  path?:   string
  groups?: NavGroup[]
}

export const NAVIGATION: NavMenu[] = [
  {
    id:    'platform',
    label: 'Платформа',
    groups: [
      {
        id:    'platform-main',
        title: 'Платформа',
        color: '#38bdf8',
        pages: [
          {
            id:          'platform-mentor',
            label:       'AI Ментор',
            icon:        '🤖',
            description: 'Персональний ментор на базі GPT-4',
            path:        '/platform/mentor',
          },
          {
            id:          'platform-wheel',
            label:       'Колесо балансу',
            icon:        '⚖️',
            description: 'Оцінка 8 сфер — основа методики',
            path:        '/platform/wheel',
          },
          {
            id:          'platform-cycle',
            label:       'Щоденний цикл',
            icon:        '📝',
            description: 'Стан → Ціль → Вибір → Дія',
            path:        '/platform/daily',
          },
          {
            id:          'platform-funnel',
            label:       'AI Воронка',
            icon:        '🚀',
            description: 'Автоматичний 11-кроковий маркетинг',
            path:        '/platform/funnel',
          },
        ],
      },
    ],
  },
  {
    id:    'programs',
    label: 'Програми',
    groups: [
      {
        id:    'programs-main',
        title: 'Програми',
        color: '#34d399',
        pages: [
          {
            id:          'programs-free',
            label:       'Free',
            icon:        '⚡',
            description: 'Колесо балансу + щоденний цикл',
            path:        '/programs/free',
          },
          {
            id:          'programs-trial',
            label:       'Trial 7 днів',
            icon:        '🔥',
            description: 'Всі функції — безкоштовно',
            path:        '/programs/trial',
          },
          {
            id:          'programs-premium',
            label:       'Premium',
            icon:        '✦',
            description: 'AI Ментор · Цілі · Zoom · Курси',
            path:        '/programs/premium',
          },
        ],
      },
    ],
  },
  {
    id:    'learning',
    label: 'Навчання',
    groups: [
      {
        id:    'learning-main',
        title: 'Навчання',
        color: '#a78bfa',
        pages: [
          {
            id:          'learning-courses',
            label:       'Курси',
            icon:        '📚',
            description: 'Структуровані програми розвитку',
            path:        '/courses',
          },
          {
            id:          'learning-blog',
            label:       'Блог',
            icon:        '📝',
            description: 'Статті та кейси',
            path:        '/blog',
          },
          {
            id:          'learning-help',
            label:       'Підтримка',
            icon:        '🛠',
            description: 'FAQ та документація',
            path:        '/support',
          },
        ],
      },
    ],
  },
]

export function getGroupPages(menuId: string, groupId?: string): NavPage[] {
  const menu = NAVIGATION.find(m => m.id === menuId)
  if (!menu?.groups) return []
  const groups = groupId
    ? menu.groups.filter(g => g.id === groupId)
    : menu.groups
  return groups.flatMap(g => g.pages)
}