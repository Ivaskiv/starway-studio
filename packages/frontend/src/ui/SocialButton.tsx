// packages/frontend/src/ui/SocialButton.tsx
import { Button } from './Button'
import { Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface SocialButtonProps {
  platform: 'telegram' | 'discord' | 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'linkedin'
  username?: string 
  connected?: boolean 
  label?: string
  className?: string
  onClick?: () => void 
}

export const SocialButton = ({ platform, username, connected = false, label, onClick, className }: SocialButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    if (onClick) return onClick() 

    if (!username) {
      toast.error('Username не вказано')
      return
    }

    setIsLoading(true)
    let url = ''

    switch (platform) {
      case 'telegram':
        url = connected
          ? `https://t.me/${username.replace(/^@/, '')}`
          : `https://t.me/${username.replace(/^@/, '')}?start=connect`
        break
      case 'discord':
        url = connected
          ? `https://discord.com/users/${username}`
          : `https://discord.com/oauth2/authorize?client_id=${username}&scope=bot`
        break
      case 'whatsapp':
        url = `https://wa.me/${username}`
        break
      case 'facebook':
        url = `https://facebook.com/${username}`
        break
      case 'twitter':
        url = `https://twitter.com/${username}`
        break
      case 'instagram':
        url = `https://instagram.com/${username}`
        break
      case 'linkedin':
        url = `https://linkedin.com/in/${username}`
        break
      default:
        toast.error('Платформа не підтримується')
        setIsLoading(false)
        return
    }

    window.open(url, '_blank')
    toast.success(`${platform[0].toUpperCase() + platform.slice(1)} ${connected ? 'відкрито' : 'підключення...'}`)

    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={`${className || ''} w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 
                 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {connected ? 'Відкриваю...' : 'Підключаю...'}
        </>
      ) : (
        <>
          <ExternalLink className="w-5 h-5" />
          {label || (connected ? `Відкрити ${platform[0].toUpperCase() + platform.slice(1)}` : `Підключити ${platform[0].toUpperCase() + platform.slice(1)}`)}
        </>
      )}
    </Button>
  )
}
