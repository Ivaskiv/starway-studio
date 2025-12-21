// src/pages/home/Home.tsx
import { Link } from 'react-router-dom'
import { 
  Sparkles, Zap, TrendingUp, Users, 
  CheckCircle, ArrowRight, Star, Rocket
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

export default function Home() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-генерація воронок',
      description: 'Створюй воронки за 3 хвилини з допомогою штучного інтелекту'
    },
    {
      icon: Zap,
      title: 'Автоматизація',
      description: 'Telegram + Email + Payment - все в одному місці'
    },
    {
      icon: TrendingUp,
      title: 'Аналітика',
      description: 'Відстежуй конверсії та оптимізуй воронки в реальному часі'
    },
    {
      icon: Users,
      title: 'AI-ментор',
      description: 'Персоналізована підтримка для кожного учня'
    }
  ]
const [demoFunnel, setDemoFunnel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAIDemo = async () => {
    setLoading(true)
    try {
      // Мок AI генерації для демо
      const demoData = await new Promise<string>((res) =>
        setTimeout(
          () =>
            res(
              `🎯 Ваша AI-воронка (демо): 
День 1: Знайомство 👋
День 2: Перша практика 🧘
День 3: Техніка дихання 💨
...`
            ),
          1000
        )
      )
      setDemoFunnel(demoData)
    } finally {
      setLoading(false)
    }
  }
  const benefits = [
    'Швидке створення воронок',
    'Інтеграція з Telegram',
    'A/B тестування',
    'White-label брендинг',
    'Live аналітика',
    'Підтримка 24/7'
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg" />
              <span className="text-xl font-bold">Starway</span>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">
                  Увійти
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">
                  Почати безкоштовно
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
            <Sparkles size={16} className="text-orange-400" />
            <span className="text-sm text-orange-400 font-medium">AI-powered платформа</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Створюй AI-воронки
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              за 3 хвилини
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Автоматизуй продажі з допомогою AI. Telegram бот + Email + Аналітика - все в одному місці
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" className="text-lg px-8 py-4">
                <Rocket size={20} />
                Спробувати безкоштовно
              </Button>
            </Link>

            <Link to="/admin/funnels/generate">
              <Button variant="secondary" className="text-lg px-8 py-4">
                <Sparkles size={20} />
                AI-генератор
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Без кредитної картки • 14 днів безкоштовно
          </p>
        </div>
      </section>

      {/* DEMO */}
<section className="py-24 px-4">
  <div className="max-w-5xl mx-auto">
    <div className="
      relative
      rounded-3xl
      p-10
      text-center
      bg-gradient-to-br from-starway-orange/20 via-starway-pink/10 to-starway-purple/20
      border border-starway-orange/30
      shadow-[0_0_60px_rgba(249,115,22,0.25)]
      overflow-hidden
    ">

      {/* glow */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-starway-orange/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-starway-pink/30 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-black/40 border border-white/10 text-starway-orange text-sm font-medium">
          <Sparkles size={16} />
          Live AI Demo
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          Зайди в AI-воронку  
          <span className="block bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            як реальний користувач
          </span>
        </h2>

        <p className="text-gray-300 text-lg mb-10 max-w-3xl mx-auto">
          Без реєстрації. Без фейкових скрінів.  
          Ти одразу в ролі креатора, який будує AI-воронку з нуля.
        </p>

        <Link to="/demo/step1-register">
          <Button
            variant="primary"
            className="text-lg px-14 py-5 rounded-xl shadow-lg shadow-orange-500/30"
          >
            <Sparkles size={22} />
            Увійти в AI-демо
          </Button>
        </Link>

        <p className="text-xs text-gray-400 mt-6">
          Повний функціонал · Гейміфікація · AI-ментор
        </p>
      </div>
    </div>
  </div>
</section>


      {/* Features */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Все що потрібно для успіху</h2>
            <p className="text-gray-400 text-lg">Повний набір інструментів для автоматизації</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} className="text-orange-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Чому обирають Starway?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Платформа створена для тих, хто цінує свій час та хоче результат
              </p>

              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="text-green-400" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link to="/register" className="inline-block mt-8">
                <Button variant="primary" className="text-lg px-8 py-4">
                  Розпочати зараз
                  <ArrowRight size={20} />
                </Button>
              </Link>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-2xl p-8 border border-orange-500/30">
              <div className="bg-gray-900 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
                  <div>
                    <p className="font-bold">Надя</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  "За тиждень створила 3 воронки і подвоїла конверсію. AI-ментор просто wow! 🔥"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-3xl font-bold text-orange-400">2.5k+</p>
                  <p className="text-sm text-gray-400">Активних користувачів</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-400">92%</p>
                  <p className="text-sm text-gray-400">Задоволеність</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-y border-orange-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Готовий до автоматизації?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Приєднуйся до тисяч підприємців, які вже автоматизували свої продажі
          </p>

          <Link to="/register">
            <Button variant="primary" className="text-lg px-12 py-4">
              <Rocket size={24} />
              Почати безкоштовно
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>© 2024 Starway. Всі права захищені.</p>
        </div>
      </footer>
    </div>
  )
}