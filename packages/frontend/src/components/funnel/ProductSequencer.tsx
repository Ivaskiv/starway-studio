// src/components/funnel/ProductSequencer.tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { 
  ChevronRight, Gift, DollarSign, 
  TrendingUp, Crown, Zap
} from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  type: 'lead-magnet' | 'tripwire' | 'core' | 'upsell' | 'backend'
  order: number
}

export default function ProductSequencer() {
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Лід-магніт', price: 0, type: 'lead-magnet', order: 1 },
    { id: '2', name: 'Tripwire', price: 99, type: 'tripwire', order: 2 },
    { id: '3', name: 'Core продукт', price: 1200, type: 'core', order: 3 },
    { id: '4', name: 'Upsell', price: 2500, type: 'upsell', order: 4 },
  ])

  const typeConfig = {
    'lead-magnet': { icon: Gift, color: 'blue', label: 'Лід-магніт' },
    'tripwire': { icon: Zap, color: 'purple', label: 'Tripwire' },
    'core': { icon: DollarSign, color: 'green', label: 'Core' },
    'upsell': { icon: TrendingUp, color: 'orange', label: 'Upsell' },
    'backend': { icon: Crown, color: 'pink', label: 'Backend' }
  }

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prods => prods.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Послідовність продуктів</h3>
        <p className="text-gray-400 text-sm">
          Вибудуй оптимальну value ladder для максимізації LTV
        </p>
      </div>

      <div className="space-y-4">
        {products.map((product, idx) => {
          const config = typeConfig[product.type]
          const Icon = config.icon

          return (
            <div key={product.id}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition">
                
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 bg-${config.color}-500/10 rounded-xl flex items-center justify-center`}>
                    <Icon size={24} className={`text-${config.color}-400`} />
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      className="font-bold"
                    />
                  </div>

                  <div className="w-32">
                    <Input
                      type="number"
                      value={product.price}
                      onChange={(e) => updateProduct(product.id, { price: parseInt(e.target.value) })}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className={`px-3 py-1 bg-${config.color}-500/10 text-${config.color}-400 rounded-full`}>
                    {config.label}
                  </span>
                  <span>•</span>
                  <span>Крок {product.order}</span>
                  <span>•</span>
                  <span>
                    {product.price === 0 
                      ? 'Безкоштовно' 
                      : `₴${product.price}`
                    }
                  </span>
                </div>
              </div>

              {idx < products.length - 1 && (
                <div className="flex justify-center py-2">
                  <ChevronRight size={24} className="text-orange-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className="text-orange-400 mt-0.5" />
          <div>
            <p className="font-medium text-orange-400 mb-1">Прогноз LTV</p>
            <p className="text-2xl font-bold">
              ₴{products.reduce((sum, p) => sum + p.price, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Середня вартість клієнта при 100% конверсії
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}