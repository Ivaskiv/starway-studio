// frontend/src/features/dashboard/layout/Sidebar.tsx
// frontend/src/features/dashboard/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Target,
  User,
  Settings,
  Package,
  GitBranch,
  Sparkles,
} from 'lucide-react'
import { useAbility } from '@/features/auth/hooks/useAbility'
import { ABILITIES, type Ability } from '@/shared/types/permissions'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  ability: Ability
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', ability: ABILITIES.DASHBOARD_VIEW },
  { to: '/dashboard/my-courses', icon: Package, label: 'Мої курси', ability: ABILITIES.DASHBOARD_VIEW },
  { to: '/dashboard/progress', icon: TrendingUp, label: 'Прогрес', ability: ABILITIES.PROGRESS_VIEW },
  { to: '/dashboard/wheel', icon: Target, label: 'Wheel of Life', ability: ABILITIES.WHEEL_VIEW },
  { to: '/dashboard/ai-mentor', icon: MessageSquare, label: 'AI Mentor', ability: ABILITIES.AI_USE },
  { to: '/dashboard/products', icon: Package, label: 'Products', ability: ABILITIES.PRODUCTS_MANAGE },
  { to: '/dashboard/funnels', icon: GitBranch, label: 'Funnels', ability: ABILITIES.FUNNELS_MANAGE },
  { to: '/dashboard/ai-generator', icon: Sparkles, label: 'AI Generator', ability: ABILITIES.AI_USE },
  { to: '/dashboard/profile', icon: User, label: 'Profile', ability: ABILITIES.PROFILE_VIEW },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', ability: ABILITIES.SETTINGS_MANAGE },
]

export default function Sidebar() {
  const can = useAbility()

  // Фільтруємо тільки ті пункти, до яких є доступ
  const visibleItems = NAV_ITEMS.filter(item => can(item.ability))

  return (
    <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
          MindFlow
        </h1>
      </div>

      <nav className="space-y-2">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
// import { NavLink } from 'react-router-dom'
// import {
//   LayoutDashboard,
//   MessageSquare,
//   TrendingUp,
//   Target,
//   User,
//   Settings,
//   Package,
//   GitBranch,
//   Sparkles,
// } from 'lucide-react'
// import { useAbility } from '@/features/auth/hooks/useAbility'
// import { ABILITIES, type Ability } from '@/shared/types/permissions'

// interface NavItem {
//   to: string
//   icon: React.ElementType
//   label: string
//   ability: Ability
// }

// const NAV_ITEMS: NavItem[] = [
//   { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', ability: ABILITIES.DASHBOARD_VIEW },
//   { to: '/dashboard/ai-mentor', icon: MessageSquare, label: 'AI Mentor', ability: ABILITIES.AI_USE },
//   { to: '/dashboard/progress', icon: TrendingUp, label: 'My Progress', ability: ABILITIES.PROGRESS_VIEW },
//   { to: '/dashboard/wheel', icon: Target, label: 'Wheel of Life', ability: ABILITIES.WHEEL_VIEW },
//   { to: '/dashboard/products', icon: Package, label: 'Products', ability: ABILITIES.PRODUCTS_MANAGE },
//   { to: '/dashboard/funnels', icon: GitBranch, label: 'Funnels', ability: ABILITIES.FUNNELS_MANAGE },
//   { to: '/dashboard/ai-generator', icon: Sparkles, label: 'AI Generator', ability: ABILITIES.AI_USE },
//   { to: '/dashboard/profile', icon: User, label: 'Profile', ability: ABILITIES.PROFILE_VIEW },
//   { to: '/dashboard/settings', icon: Settings, label: 'Settings', ability: ABILITIES.SETTINGS_MANAGE },
// ]

// export default function Sidebar() {
//   const can = useAbility()

//   // Фільтруємо тільки ті пункти, до яких є доступ
//   const visibleItems = NAV_ITEMS.filter(item => can(item.ability))

//   return (
//     <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 p-4">
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
//           MindFlow
//         </h1>
//       </div>

//       <nav className="space-y-2">
//         {visibleItems.map(({ to, icon: Icon, label }) => (
//           <NavLink
//             key={to}
//             to={to}
//             end={to === '/dashboard'}
//             className={({ isActive }) =>
//               `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
//                 isActive
//                   ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-400 border border-orange-500/30'
//                   : 'text-white/60 hover:text-white hover:bg-white/5'
//               }`
//             }
//           >
//             <Icon className="w-5 h-5" />
//             <span className="font-medium">{label}</span>
//           </NavLink>
//         ))}
//       </nav>
//     </aside>
//   )
// }