import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import { LogOut, Moon, Sun, Package, GitBranch, Home } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/products', label: 'Продукти', icon: Package },
  { to: '/funnels', label: 'Воронки', icon: GitBranch },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout, theme, toggleTheme } = useStore()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Starway
        </h1>
        <p className="text-gray-400 text-sm">AI Воронки</p>
      </div>

      <nav className="flex-1 space-y-2">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              location.pathname === item.to
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4 space-y-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Світла тема' : 'Темна тема'}</span>
        </button>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold">
            {user?.name[0]}
          </div>
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/50 text-red-400 transition"
        >
          <LogOut size={20} />
          <span>Вийти</span>
        </button>
      </div>
    </aside>
  )
}