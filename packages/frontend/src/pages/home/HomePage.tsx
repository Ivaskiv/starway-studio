// packages/frontend/src/pages/HomePage.tsx

import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Bot, TrendingUp, ArrowRight, Play, Star } from 'lucide-react';
import Header from '@frontend/components/layout/Header';
import Footer from '@frontend/components/layout/Footer';
import { Button } from '@starway/shared/ui';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Hero Section - Bento Grid */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          
          {/* Main Headline */}
          <div className="text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 glass-button badge-orange">
              <Star className="w-4 h-4" />
              <span>Нова ера онлайн-освіти</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold leading-tight">
              Створюй
              <span className="block text-gradient">
                AI-воронки
              </span>
              за хвилини, не за місяці
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Перша платформа в Україні для створення інтелектуальних освітніх продуктів з інтеграцією в Telegram та повною автоматизацією продажів
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={() => navigate('/auth')}
                variant="primary"
                size="lg"
                className="gradient-button text-lg animate-glow"
              >
                <span className="flex items-center gap-2">
                  Спробувати безкоштовно
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <Button variant="ghost" size="lg" className="glass-button text-lg">
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Дивитись демо
                </span>
              </Button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Large Card - Left */}
            <div className="md:col-span-2 md:row-span-2 glass-card-gradient p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-orange rounded-2xl flex items-center justify-center mb-6 rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-orange-500/50">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold mb-4">Швидке створення</h3>
                <p className="text-gray-400 text-lg mb-6">
                  Запусти AI-воронку без коду за 15 хвилин. Telegram бот, веб-інтерфейс, і AI-асистент — все в одному місці
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="badge-orange">Telegram Mini App</span>
                  <span className="badge-orange">AI-ассистент</span>
                  <span className="badge-orange">Автотрекінг</span>
                </div>
              </div>
            </div>

            {/* Card - Top Right */}
            <div className="glass-card p-8 hover:scale-[1.02] transition-transform">
              <div className="icon-container-orange mb-4 -rotate-3 w-14 h-14">
                <Bot className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI-асистент</h3>
              <p className="text-gray-400">
                Персоналізований чат-бот для кожного клієнта
              </p>
            </div>

            {/* Card - Bottom Right */}
            <div className="glass-card p-8 hover:scale-[1.02] transition-transform">
              <div className="icon-container-green mb-4 rotate-3 w-14 h-14">
                <TrendingUp className="w-7 h-7 text-green-500" />
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
      <section className="py-20 px-6 bg-gradient-to-b from-black to-gray-900/20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <div className="stats-card-value text-gradient mb-2">
                10,000+
              </div>
              <p className="text-gray-400 font-semibold">Задоволених користувачів</p>
            </div>
            
            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <div className="stats-card-value text-gradient-green mb-2">
                500+
              </div>
              <p className="text-gray-400 font-semibold">Створених воронок</p>
            </div>
            
            <div className="glass-card p-8 text-center hover:scale-105 transition-transform">
              <div className="stats-card-value text-gradient mb-2">
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
          <div className="bg-gradient-orange p-1 rounded-3xl shadow-2xl shadow-orange-500/30">
            <div className="glass-card bg-black/80 p-12 text-center">
              <h2 className="text-5xl font-bold mb-6">
                Готовий створити свою<br />першу AI-воронку?
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Приєднуйся до тисяч успішних творців
              </p>
              <Button
                onClick={() => navigate('/auth')}
                variant="primary"
                size="lg"
                className="gradient-button text-xl animate-glow"
              >
                Почати безкоштовно →
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}