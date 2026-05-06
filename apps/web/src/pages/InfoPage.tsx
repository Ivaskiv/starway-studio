// frontend/src/pages/InfoPage.tsx
import AuthModal from '@/features/auth/components/AuthModal'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { GlassCard } from '@/ui'
import { useLocation } from 'react-router-dom'

const CONTENT: Record<string, { title: string; description: string }> = {
  // '/help':     { title: 'Допомога',              description: 'Оберіть потрібний розділ у навігації або зверніться в підтримку для консультації.' },
  // '/about':    { title: 'Про Starway',           description: 'Starway Studio допомагає будувати стабільний прогрес через менторські інструменти та освітні модулі.' },
  // '/blog':     { title: 'Блог',                  description: 'Оновлення, кейси студентів і практичні матеріали скоро будуть доступні у цьому розділі.' },
  // '/careers':  { title: "Кар'єра",               description: 'Ми розвиваємо продуктову команду. Напишіть нам, якщо хочете працювати разом.' },
  // '/contact':  { title: 'Контакти',              description: 'Питання щодо продукту та партнерства можна надіслати через форму підтримки.' },
  // '/faq':      { title: 'FAQ',                   description: 'Поширені питання по доступу, підписці, відновленню облікового запису і функціоналу платформи.' },
  // '/terms':    { title: 'Умови використання',    description: 'Правила використання платформи, оплати, доступу до контенту і обмеження відповідальності.' },
  '/privacy':  { title: 'Політика приватності',  description: 'Ми обробляємо лише необхідні дані користувача для роботи сервісу та персоналізації досвіду.' },
  '/cookies':  { title: 'Cookies',               description: 'Cookies використовуються для безпеки сесій, аналітики та збереження налаштувань інтерфейсу.' },
}

export default function InfoPage() {
  const location = useLocation()
  const { navigateTo, authModalOpen, closeAuthModal } = useSmartNavigation()
  const data = CONTENT[location.pathname] ?? { title: 'Інформація', description: 'Сторінка з інформацією.' }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <GlassCard className="p-8">
        <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
          {data.title}
        </h1>
        <p className="text-[color:var(--text-secondary)] mt-3 leading-relaxed">
          {data.description}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/dashboard/subscription', { requiresAuth: true })}
            className="theme-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Переглянути підписки
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/dashboard/products', { requiresAuth: true })}
            className="theme-btn-secondary rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Переглянути продукти
          </button>
        </div>
      </GlassCard>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode="login" />
    </div>
  )
}
