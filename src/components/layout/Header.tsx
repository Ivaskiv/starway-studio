// src/components/layout/Header.tsx
import { useStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export default function Header() {
  const { user, logout } = useStore()
  const navigate = useNavigate()

  return (
    <header className="home-header">
      <h1 className="home-logo">Starway</h1>
      <div className="auth-buttons">
        {!user ? (
          <>
            <button onClick={() => navigate('/login')} className="btn-login">
              Ввійти
            </button>
            <button onClick={() => navigate('/register')} className="btn-register">
              Зареєструватися
            </button>
          </>
        ) : (
          <button onClick={logout} className="btn-logout">
            <LogOut className="h-5 w-5 mr-2" />
            Вийти
          </button>
        )}
      </div>
    </header>
  )
}