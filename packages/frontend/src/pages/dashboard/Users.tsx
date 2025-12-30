// packages/frontend/src/pages/dashboard/Users.tsx

import { Card, CardContent } from '@starway-studio/shared';
import { Users as UsersIcon } from 'lucide-react';

const Users = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Користувачі</h1>
      
      <Card>
        <CardContent className="p-12 text-center">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Список користувачів
          </h3>
          <p className="text-gray-600">
            Тут з'являться ваші підписники
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;