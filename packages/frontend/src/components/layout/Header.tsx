// src/components/layout/Header.tsx
import { Link } from 'react-router-dom'
import { Menu, Bell, Settings, LogOut, User } from 'lucide-react'
import { useStore } from '../../store/store'

export default function Header() {
  const { user, logout, toggleSidebar } = useStore()

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Ліва частина: Logo + Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition"
              aria-label="Відкрити меню"
            >
              <Menu size={20} />
            </button>
            
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                Starway
              </span>
            </Link>
          </div>

          {/* Права частина: User Menu */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button 
                className="p-2 hover:bg-gray-800 rounded-lg transition relative"
                aria-label="Сповіщення"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </button>

              {/* Settings */}
              <Link 
                to="/admin/settings"
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                aria-label="Налаштування"
              >
                <Settings size={20} />
              </Link>

              {/* User Dropdown */}
              <div className="flex items-center gap-3 pl-3 border-l border-gray-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User size={20} />
                </div>

                <button
                  onClick={logout}
                  className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition"
                  aria-label="Вийти з системи"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm hover:bg-gray-800 rounded-lg transition"
              >
                Увійти
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg font-medium hover:scale-105 transition"
              >
                Реєстрація
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}