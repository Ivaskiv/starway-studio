// src/components/sidebar/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Boxes, Workflow, BarChart3, Settings, X } from 'lucide-react'
import { useStore } from '../../store'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Продукти', href: '/admin/products', icon: Boxes },
  { name: 'Воронки', href: '/admin/funnels', icon: Workflow },
  { name: 'Аналітика', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Налаштування', href: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useStore()

  return (
    <>
      {/* Overlay для мобільних */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64
        bg-gray-900 border-r border-gray-800
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg" />
            <span className="text-xl font-bold">Starway</span>
          </div>
          
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Закрити меню"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center">
            Starway Studio v1.0
          </div>
        </div>
      </aside>
    </>
  )
}