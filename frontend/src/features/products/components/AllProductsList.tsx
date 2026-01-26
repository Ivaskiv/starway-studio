// frontend/src/features/products/components/AllProductsList.tsx

import { Lock, Star, Users, Clock } from 'lucide-react'
import { Button, GlassCard } from '@/ui'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Product } from '@/shared/types/product.types'

// interface Product {
//   id: string
//   title: string
//   description: string
//   price: number
//   isPremium: boolean
//   creator: {
//     id: string
//     name: string
//     avatar?: string
//   }
//   stats: {
//     students: number
//     rating: number
//     duration: string
//   }
//   thumbnail?: string
// }

// Мок дані - потім замінити на API
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Основи особистісного розвитку',
    description: 'Базовий курс для тих, хто тільки починає свій шлях саморозвитку',
    price: 0,
    isPremium: false,
    creator: {
      id: 'admin1',
      name: 'Олександр Іванов',
    },
    stats: {
      students: 1234,
      rating: 4.8,
      duration: '8 годин',
    },
  },
  {
    id: '2',
    title: 'Майстерність тайм-менеджменту',
    description: 'Навчіться ефективно керувати своїм часом та досягати більшого',
    price: 1499,
    isPremium: true,
    creator: {
      id: 'admin2',
      name: 'Марія Коваленко',
    },
    stats: {
      students: 856,
      rating: 4.9,
      duration: '12 годин',
    },
  },
  {
    id: '3',
    title: 'Колесо життєвого балансу',
    description: 'Знайдіть гармонію між різними сферами життя',
    price: 0,
    isPremium: false,
    creator: {ф
      id: 'admin1',
      name: 'Олександр Іванов',
    },
    stats: {
      students: 2145,
      rating: 4.7,
      duration: '6 годин',
    },
  },
  {
    id: '4',
    title: 'Емоційний інтелект: Практикум',
    description: 'Розвиток EQ для кращої комунікації та самопізнання',
    price: 2499,
    isPremium: true,
    creator: {
      id: 'admin3',
      name: 'Ірина Петренко',
    },
    stats: {
      students: 567,
      rating: 5.0,
      duration: '15 годин',
    },
  },
]

export default function AllProductsList() {
  const { user } = useAuth()

  // Перевірка, чи користувач має доступ до преміум контенту
  const hasAccessToPremium = (product: Product) => {
    if (!product.isPremium) return true
    // TODO: перевірити subscriptionsRole користувача
    // Якщо user.subscriptionsRole містить product.creator.id - є доступ
    return false
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Усі курси</h1>
        <p className="text-white/60">
          Обирайте курси для розвитку. Безкоштовні доступні одразу, преміум - після підписки.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PRODUCTS.map((product) => {
          const hasAccess = hasAccessToPremium(product)

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
                <h3 className="text-xl font-bold text-white line-clamp-2">
                  {product.title}
                </h3>
                
                <p className="text-white/60 text-sm line-clamp-2">
                  {product.description}
                </p>

                {/* Creator */}
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
                  <span>{product.creator.name}</span>
                </div>

                {/* Stats */}
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

                {/* Price / Action */}
                <div className="pt-3 border-t border-white/10">
                  {hasAccess ? (
                    <Button className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity">
                      {product.price === 0 ? 'Почати навчання' : 'Відкрити курс'}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">
                        {product.price} ₴
                      </span>
                      <Button className="px-6 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20">
                        Підписатися
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}