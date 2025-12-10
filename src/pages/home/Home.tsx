// src/pages/Home.tsx — ЧИСТИЙ, БЕЗ ДУБЛЮВАННЯ
import Header from '@/components/layout/Header'
import './Home.scss'
import Footer from '@/components/layout/Footer'
import TelegramMenu from '@/components/layout/TelegramMenu'

export default function Home() {
  return (
    <div className="home-layout">
      <Header />
      
      <main className="home-content">
        <h2 className="home-title">Ласкаво просимо в Starway!</h2>
        <p className="home-description">
          Створюйте AI-воронки швидко та ефективно. Найкращий інструмент для вашого бізнесу.
        </p>

        <div className="home-features">
          <div className="feature-card">
            <Package className="h-12 w-12 text-indigo-400 mb-4" />
            <h3>AI-Воронки</h3>
            <p>Автоматизуйте продажі з розумними алгоритмами.</p>
          </div>
          <div className="feature-card">
            <GitBranch className="h-12 w-12 text-orange-400 mb-4" />
            <h3>Telegram-Інтеграція</h3>
            <p>Запускайте в Telegram за хвилини.</p>
          </div>
          <div className="feature-card">
            <Home className="h-12 w-12 text-green-400 mb-4" />
            <h3>Респонсивний Дизайн</h3>
            <p>Ідеально на будь-якому пристрої.</p>
          </div>
        </div>
      </main>

      <Footer />
      <TelegramMenu />
    </div>
  )
}