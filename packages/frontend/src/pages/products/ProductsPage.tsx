// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/products/ProductsPage.tsx
// packages/frontend/src/pages/dashboard/Products.tsx

import { Card, CardContent } from '@/ui';
import { Package } from 'lucide-react';

const Products = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Продукти</h1>
          <p className="text-gray-600 mt-1">Керуйте продуктами та підписками</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Продукти в розробці
          </h3>
          <p className="text-gray-600">
            Тут з'являться AI Mentor, Gamification та інші продукти
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;