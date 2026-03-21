import AuthModal from '@/features/auth/components/AuthModal'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [])

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)]">
      <AuthModal isOpen onClose={() => navigate('/', { replace: true })} defaultMode="login" />
    </div>
  )
}
