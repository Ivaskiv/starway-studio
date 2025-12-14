import { useStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { Home, Package, GitBranch, User } from 'lucide-react'
import './TelegramMenu.scss'

interface TelegramMenuProps {
  telegramOpen: boolean
  setTelegramOpen: (open: boolean) => void
}

export default function TelegramMenu({ telegramOpen, setTelegramOpen }: TelegramMenuProps) {
  const { user } = useStore()
  const navigate = useNavigate()

  const handleClick = (path: string) => {
    navigate(user ? path : '/login')
    setTelegramOpen(true) 
  }

  return (
    <nav className="telegram-menu">
      <button className="menu-item" onClick={() => handleClick('/')}>
        <Home className="h-6 w-6" />
        <span>Головна</span>
      </button>
      <button className="menu-item" onClick={() => handleClick('/admin/products')}>
        <Package className="h-6 w-6" />
        <span>Продукти</span>
      </button>
      <button className="menu-item" onClick={() => handleClick('/admin/funnels')}>
        <GitBranch className="h-6 w-6" />
        <span>Воронки</span>
      </button>
      <button className="menu-item" onClick={() => handleClick('/profile')}>
        <User className="h-6 w-6" />
        <span>Профіль</span>
      </button>
    </nav>
  )
}
