// packages/frontend/src/pages/dashboard/Analytics.tsx

import { Card, CardHeader, CardContent } from '@starway-studio/shared';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Аналітика</h1>
        <p className="text-gray-600 mt-1">Детальна статистика ваших воронок</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Аналітика в розробці
          </h3>
          <p className="text-gray-600">
            Тут з'являться графіки та детальна статистика
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;