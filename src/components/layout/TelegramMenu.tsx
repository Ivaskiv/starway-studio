// src/components/layout/TelegramMenu.tsx
import { useStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { Home, Package, GitBranch, User } from 'lucide-react'

export default function TelegramMenu() {
  const { user } = useStore()
  const navigate = useNavigate()

  return (
    <nav className="telegram-menu">
      <button className="menu-item active">
        <Home className="h-6 w-6" />
        <span>Головна</span>
      </button>
      <button 
        className="menu-item" 
        onClick={() => navigate(user ? '/admin/products' : '/login')}
      >
        <Package className="h-6 w-6" />
        <span>Продукти</span>
      </button>
      <button 
        className="menu-item" 
        onClick={() => navigate(user ? '/admin/funnels' : '/login')}
      >
        <GitBranch className="h-6 w-6" />
        <span>Воронки</span>
      </button>
      <button 
        className="menu-item" 
        onClick={() => navigate(user ? '/profile' : '/login')}
      >
        <User className="h-6 w-6" />
        <span>Профіль</span>
      </button>
    </nav>
  )
}