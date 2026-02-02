// /features/products/components/AllProductsList.tsx

import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Product } from '@/shared/types/product.types';
import { Button, GlassCard } from '@/ui';
import { Clock, Lock, Star, Users } from 'lucide-react';

// Мок дані (типізовані)
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'osnovy-rozvytku',
    title: 'Основи особистісного розвитку',
    description: 'Базовий курс для тих, хто тільки починає свій шлях саморозвитку',
    price: 0,
    currency: 'UAH',
    type: 'course',
    status: 'published',
    isPremium: false,
    creatorId: 'admin1',
    creator: { id: 'admin1', name: 'Олександр Іванов' },
    stats: { students: 1234, rating: 4.8, duration: '8 годин' },
    includesTrial: false,
    trialDays: 0,
    includesMentorship: false,
    format: 'web',
    integration: 'web',
    modules: [],
    goals: [],
    funnelId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'time-management',
    title: 'Майстерність тайм-менеджменту',
    description: 'Навчіться ефективно керувати своїм часом та досягати більшого',
    price: 1499,
    currency: 'UAH',
    type: 'course',
    status: 'published',
    isPremium: true,
    creatorId: 'admin2',
    creator: { id: 'admin2', name: 'Марія Коваленко' },
    stats: { students: 856, rating: 4.9, duration: '12 годин' },
    includesTrial: true,
    trialDays: 7,
    includesMentorship: true,
    format: 'web',
    integration: 'telegram',
    modules: [],
    goals: [],
    funnelId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'wheel-of-life',
    title: 'Колесо життєвого балансу',
    description: 'Знайдіть гармонію між різними сферами життя',
    price: 0,
    currency: 'UAH',
    type: 'course',
    status: 'published',
    isPremium: false,
    creatorId: 'admin1',
    creator: { id: 'admin1', name: 'Олександр Іванов' },
    stats: { students: 2145, rating: 4.7, duration: '6 годин' },
    includesTrial: false,
    trialDays: 0,
    includesMentorship: false,
    format: 'web',
    integration: 'web',
    modules: [],
    goals: [],
    funnelId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'emotional-intelligence',
    title: 'Емоційний інтелект: Практикум',
    description: 'Розвиток EQ для кращої комунікації та самопізнання',
    price: 2499,
    currency: 'UAH',
    type: 'course',
    status: 'published',
    isPremium: true,
    creatorId: 'admin3',
    creator: { id: 'admin3', name: 'Ірина Петренко' },
    stats: { students: 567, rating: 5.0, duration: '15 годин' },
    includesTrial: true,
    trialDays: 14,
    includesMentorship: true,
    format: 'mini_app',
    integration: 'telegram',
    modules: [],
    goals: [],
    funnelId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function AllProductsList() {
  const { user } = useAuth();

  // Перевірка доступу до преміум контенту
  const hasAccessToPremium = (product: Product): boolean => {
    if (!product.isPremium) return true;
    if (!user?.subscriptionsRole) return false;

    // subscriptionsRole — це масив ID креаторів, на яких є підписка
    return user.subscriptionsRole.includes(product.creatorId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Усі курси</h1>
        <p className="text-white/60">
          Обирайте курси для розвитку. Безкоштовні доступні одразу, преміум — після підписки.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PRODUCTS.map((product: Product) => {
          const hasAccess = hasAccessToPremium(product);

          return (
            <GlassCard
              key={product.id}
              className={`p-0 overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer ${
                !hasAccess ? 'relative' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center relative">
                {!hasAccess && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center">
                    <Lock className="w-12 h-12 text-white/60" />
                  </div>
                )}
                <div className="text-6xl opacity-20">📚</div>
                {product.isPremium && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-xs font-semibold text-white">
                    Premium
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-white line-clamp-2">{product.title}</h3>
                <p className="text-white/60 text-sm line-clamp-2">{product.description}</p>

                {/* Creator */}
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
                  <span>{product.creator.name}</span>
                </div>

                {/* Stats */}
                {product.stats && (
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{product.stats.students}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{product.stats.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{product.stats.duration}</span>
                    </div>
                  </div>
                )}

                {/* Price / Action */}
                <div className="pt-3 border-t border-white/10">
                  {hasAccess ? (
                    <Button className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity">
                      {product.price === 0 ? 'Почати навчання' : 'Відкрити курс'}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{product.price} ₴</span>
                      <Button className="px-6 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20">
                        Підписатися
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
