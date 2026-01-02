// packages/frontend/src/components/aIGenerator/AIProductGenerator.tsx
import React, { useState } from 'react';
import { useAIGenerator } from '@frontend/pages/dashboard/AIGeneratorProvider';
import { Package, Loader, Plus, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@starway/shared/ui';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'course' | 'consultation' | 'template' | 'subscription';
  features: string[];
}

export const AIProductGenerator: React.FC = () => {
  const { setStage } = useAIGenerator();
  const [isGenerating, setIsGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const generateProducts = async () => {
    setIsGenerating(true);
    
    // Mock AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockProducts: Product[] = [
      {
        id: 'prod_1',
        name: 'Базовий курс йоги',
        description: '8 тижнів навчання основам йоги з відео-уроками та підтримкою',
        price: 1999,
        type: 'course',
        features: [
          'Щоденні відео-уроки 20-40 хв',
          'Доступ до спільноти',
          'Трекер прогресу',
          'Сертифікат після завершення'
        ]
      },
      {
        id: 'prod_2',
        name: 'Преміум курс з AI-коучем',
        description: 'Розширена програма з персональним AI-асистентом та live-сесіями',
        price: 4999,
        type: 'course',
        features: [
          'Все з базового курсу',
          'Персональний AI-коуч 24/7',
          '4 live-сесії з викладачем',
          'Індивідуальний план практики',
          'Безстроковий доступ'
        ]
      },
      {
        id: 'prod_3',
        name: 'Місячна підписка',
        description: 'Доступ до всіх курсів та практик платформи',
        price: 499,
        type: 'subscription',
        features: [
          'Необмежений доступ до всіх курсів',
          'Щотижневі нові практики',
          'AI-коуч',
          'Участь у всіх live-сесіях',
          'Можна скасувати будь-коли'
        ]
      },
      {
        id: 'prod_4',
        name: 'Персональна консультація',
        description: '60-хвилинна індивідуальна сесія з викладачем',
        price: 1500,
        type: 'consultation',
        features: [
          '60 хв індивідуальної роботи',
          'Аналіз вашої практики',
          'Персональні рекомендації',
          'Запис сесії',
          'План розвитку на місяць'
        ]
      }
    ];
    
    setProducts(mockProducts);
    setIsGenerating(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    if (selectedProducts.size === 0) {
      alert('Оберіть хоча б один продукт');
      return;
    }
    
    console.log('Selected products:', Array.from(selectedProducts));
    setStage('analytics');
  };

  const productTypeLabels = {
    course: 'Курс',
    consultation: 'Консультація',
    template: 'Шаблон',
    subscription: 'Підписка'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Продукти воронки</h2>
          <p className="text-slate-400">
            AI згенерував продукти на основі вашої воронки. Оберіть які хочете додати.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStage('funnel')}
          className="glass-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад до воронки
        </Button>
      </div>

      {/* Generate Button */}
      {products.length === 0 && (
        <div className="glass-card-gradient p-12 text-center">
          <div className="icon-container-orange w-16 h-16 mx-auto mb-6">
            <Package className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">
            Готові згенерувати продукти?
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            AI проаналізує вашу воронку та створить оптимальний набір продуктів з цінами та описами
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={generateProducts}
            disabled={isGenerating}
            className="gradient-button"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                AI генерує продукти...
              </>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2" />
                Згенерувати продукти
              </>
            )}
          </Button>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              
              return (
                <div
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`glass-card p-6 cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-orange-500 bg-slate-800/80' 
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="badge-orange text-xs">
                          {productTypeLabels[product.type]}
                        </span>
                        <h3 className="font-bold text-white text-lg">
                          {product.name}
                        </h3>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">
                        {product.description}
                      </p>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                      ${isSelected 
                        ? 'border-orange-500 bg-orange-500' 
                        : 'border-slate-600'
                      }
                    `}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {product.price}
                      </span>
                      <span className="text-slate-400">грн</span>
                      {product.type === 'subscription' && (
                        <span className="text-slate-500 text-sm">/місяць</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {product.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between glass-card p-6">
            <div>
              <p className="text-white font-semibold">
                Обрано продуктів: {selectedProducts.size}
              </p>
              <p className="text-slate-400 text-sm">
                Оберіть продукти, які хочете додати до воронки
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="lg"
                onClick={generateProducts}
                disabled={isGenerating}
                className="glass-button"
              >
                <Package className="w-5 h-5 mr-2" />
                Регенерувати
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinue}
                disabled={selectedProducts.size === 0}
                className="gradient-button"
              >
                Продовжити
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};