// frontend/src/features/landing/sections/FinalCTASection.tsx

import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { GlassCard } from '@/ui/GlassCard';
import { Button } from '@/ui';

interface FinalCTASectionProps {
  onGetStarted: () => void;
}

export function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-12 md:p-16 text-center relative overflow-hidden group">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 group-hover:from-orange-500/15 group-hover:to-pink-500/15 transition-all duration-500" />
          
          {/* Floating Elements */}
          <div className="absolute top-10 left-10 opacity-20">
            <Sparkles className="w-12 h-12 text-orange-500 animate-pulse" />
          </div>
          <div className="absolute bottom-10 right-10 opacity-20">
            <Sparkles className="w-16 h-16 text-pink-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Heading */}
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Готовий почати{' '}
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                трансформацію
              </span>
              ?
            </h2>

            {/* Subheading */}
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Приєднуйся до <strong className="text-white">1,247+</strong> користувачів,
              які вже змінюють своє життя з AI Ментором
            </p>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={onGetStarted}
                data-color="orange"
                data-size="lg"
                className="text-lg px-10 py-5 hover:scale-105 transition-transform shadow-2xl shadow-orange-500/30"
              >
                <Play className="w-6 h-6 mr-2" />
                Почати безкоштовно
              </Button>

              {/* Additional Info */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Кредитна карта не потрібна</span>
                </div>
                <span className="hidden sm:block">•</span>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>7 днів trial всіх функцій</span>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-10 pt-10 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span><strong className="text-white">4.9/5</strong> рейтинг</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Захищені платежі</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Підтримка 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}