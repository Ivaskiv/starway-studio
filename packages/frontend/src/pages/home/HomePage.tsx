// packages/frontend/src/pages/home/HomePage.tsx
import { Button } from '@/ui';
import { ArrowRight, Bot, Play, Star, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* Hero Section */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-16 px-4 md:px-6 flex-1">
        <div className="container mx-auto max-w-7xl">
          
          {/* Main Headline */}
          <div className="text-center mb-10 md:mb-14 space-y-4 md:space-y-5 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full">
              <Star className="w-4 h-4 text-orange-400" />
              <span className="text-sm md:text-base text-white font-medium">Нова ера онлайн-освіти</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight px-4">
              Створюй{' '}
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                AI-воронки
              </span>
              {' '}за хвилини, <br/> не за місяці
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto px-4 leading-relaxed">
            Перша платформа в Україні для створення AI-курсів нового покоління з автоматизованими продажами та інтеграцією у соцмережі            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 px-4">
              <Button
                onClick={() => navigate('/auth')}
                data-color="orange"
                data-size="lg"
                className="w-full sm:w-auto min-w-[220px] group"
              >
                <span className="flex items-center justify-center gap-2">
                  Спробувати безкоштовно
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <Button 
                data-size="lg" 
                className="glass-card hover:bg-white/10 w-full sm:w-auto min-w-[200px]"
              >
                <span className="flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  Дивитись демо
                </span>
              </Button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-slide-up">
            
            {/* Large Card */}
            <div className="md:col-span-2 md:row-span-2 glass-card p-6 md:p-10 group" data-hover="lift" data-glow>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mb-4 md:mb-6 rotate-3 group-hover:rotate-6 transition-all duration-500 shadow-2xl bg-gradient-to-br from-orange-500 to-red-500">
                  <Zap className="w-7 h-7 md:w-10 md:h-10 text-white" />
                </div>
                
                <h3 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-white">Швидке створення</h3>
                <p className="text-slate-400 text-sm md:text-base mb-4 md:mb-6 leading-relaxed">
                  Запусти AI-воронку без коду за 15 хвилин. Telegram бот, веб-інтерфейс, і AI-асистент — все в одному місці
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 rounded-xl text-xs md:text-sm font-semibold border border-orange-500/30">
                    Telegram Mini App
                  </span>
                  <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-xl text-xs md:text-sm font-semibold border border-purple-500/30">
                    AI-асистент
                  </span>
                  <span className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 rounded-xl text-xs md:text-sm font-semibold border border-green-500/30">
                    Автотрекінг
                  </span>
                </div>
              </div>
            </div>

            {/* Card - Top Right */}
            <div className="glass-card p-6 md:p-8 group" data-hover="lift">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 md:mb-4 -rotate-3 group-hover:rotate-0 transition-all duration-500 shadow-xl bg-gradient-to-br from-orange-500 to-red-500">
                <Bot className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 text-white">AI-асистент</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Персоналізований чат-бот для кожного клієнта
              </p>
            </div>

            {/* Card - Bottom Right */}
            <div className="glass-card p-6 md:p-8 group" data-hover="lift">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 md:mb-4 rotate-3 group-hover:rotate-0 transition-all duration-500 shadow-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 text-white">Аналітика</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Відстежуй прогрес та конверсію в реальному часі
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="glass-card p-6 md:p-8 text-center group" data-hover="lift">
              <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                10,000+
              </div>
              <p className="text-slate-400 font-semibold text-sm">Задоволених користувачів</p>
            </div>
            
            <div className="glass-card p-6 md:p-8 text-center group" data-hover="lift">
              <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <p className="text-slate-400 font-semibold text-sm">Створених воронок</p>
            </div>
            
            <div className="glass-card p-6 md:p-8 text-center group" data-hover="lift">
              <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
                98%
              </div>
              <p className="text-slate-400 font-semibold text-sm">Рівень задоволеності</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden group" data-glow data-hover="lift">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">
                Готовий створити свою першу AI-воронку?
              </h2>
              <p className="text-sm md:text-base text-slate-400 mb-6">
                Приєднуйся до тисяч успішних творців
              </p>
              <Button
                onClick={() => navigate('/auth')}
                data-color="orange"
                data-size="lg"
                className="w-full sm:w-auto min-w-[260px]"
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