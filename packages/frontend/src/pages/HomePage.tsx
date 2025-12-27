// packages/frontend/src/pages/HomePage.tsx

import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Bot, TrendingUp, ArrowRight, Play, Star } from 'lucide-react';
import Header from '@frontend/components/layout/Header';
import Footer from '@frontend/components/layout/Footer';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Використовуємо твій Header */}
      <Header />

      {/* Hero Section - Bento Grid */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          
          {/* Main Headline */}
          <div className="text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-starway-orange/10 border border-starway-orange/20 rounded-full text-starway-orange font-semibold text-sm">
              <Star className="w-4 h-4" />
              <span>Нова ера онлайн-освіти</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold leading-tight">
              Створюй
              <span className="block bg-gradient-to-r from-starway-orange via-starway-pink to-starway-purple bg-clip-text text-transparent">
                AI-воронки
              </span>
              за хвилини, не за місяці
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Перша платформа в Україні для створення інтелектуальних освітніх продуктів з інтеграцією в Telegram та повною автоматизацією продажів
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/auth')}
                className="group px-8 py-4 bg-gradient-to-r from-starway-orange to-starway-pink rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-starway-orange/50"
              >
                <span className="flex items-center gap-2">
                  Спробувати безкоштовно
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              
              <button className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Дивитись демо
                </span>
              </button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Large Card - Left */}
            <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-starway-purple/20 to-starway-pink/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-starway-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-starway-purple to-starway-pink rounded-2xl flex items-center justify-center mb-6 rotate-3 group-hover:rotate-6 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold mb-4">Швидке створення</h3>
                <p className="text-gray-400 text-lg mb-6">
                  Запусти AI-воронку без коду за 15 хвилин. Telegram бот, веб-інтерфейс, і AI-асистент — все в одному місці
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-semibold">Telegram Mini App</span>
                  <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-semibold">AI-ассистент</span>
                  <span className="px-4 py-2 bg-white/10 rounded-full text-sm font-semibold">Автотрекінг</span>
                </div>
              </div>
            </div>

            {/* Card - Top Right */}
            <div className="bg-gradient-to-br from-starway-orange/20 to-starway-pink/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:scale-[1.02] transition-transform">
              <div className="w-14 h-14 bg-gradient-to-br from-starway-orange to-starway-pink rounded-2xl flex items-center justify-center mb-4 -rotate-3">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI-асистент</h3>
              <p className="text-gray-400">
                Персоналізований чат-бот для кожного клієнта
              </p>
            </div>

            {/* Card - Bottom Right */}
            <div className="bg-gradient-to-br from-starway-blue/20 to-starway-purple/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:scale-[1.02] transition-transform">
              <div className="w-14 h-14 bg-gradient-to-br from-starway-blue to-starway-purple rounded-2xl flex items-center justify-center mb-4 rotate-3">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Аналітика</h3>
              <p className="text-gray-400">
                Відстежуй прогрес та конверсію в реальному часі
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-starway-dark/20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center hover:bg-white/10 transition-all">
              <div className="text-5xl font-bold bg-gradient-to-r from-starway-orange to-starway-pink bg-clip-text text-transparent mb-2">
                10,000+
              </div>
              <p className="text-gray-400 font-semibold">Задоволених користувачів</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center hover:bg-white/10 transition-all">
              <div className="text-5xl font-bold bg-gradient-to-r from-starway-purple to-starway-blue bg-clip-text text-transparent mb-2">
                500+
              </div>
              <p className="text-gray-400 font-semibold">Створених воронок</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center hover:bg-white/10 transition-all">
              <div className="text-5xl font-bold bg-gradient-to-r from-starway-pink to-starway-purple bg-clip-text text-transparent mb-2">
                98%
              </div>
              <p className="text-gray-400 font-semibold">Рівень задоволеності</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-starway-orange via-starway-pink to-starway-purple p-1 rounded-3xl">
            <div className="bg-black rounded-3xl p-12 text-center">
              <h2 className="text-5xl font-bold mb-6">
                Готовий створити свою<br />першу AI-воронку?
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Приєднуйся до тисяч успішних творців
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-10 py-5 bg-gradient-to-r from-starway-orange to-starway-pink rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl shadow-starway-orange/50"
              >
                Почати безкоштовно →
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}