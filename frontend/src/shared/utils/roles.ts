// /features/auth/utils/roles.ts
import type { User } from '@/shared/types/user.types';

// 🔹 Коротка логіка ролей та підписок

// Апгрейд користувача до адміна
export const upgradeToAdmin = (user: User): User => ({
  ...user,
  role: 'admin',
});

// Перевірка чи користувач адмін
export const isAdmin = (user?: User) => user?.role === 'admin';

// Фільтрація контенту для користувача
export const filterContentForUser = (
  user: User | null,
  content: Array<{ id: string; adminId: string; isPremium: boolean }>,
) => {
  if (!user) {
    // Неавторизовані бачать тільки безкоштовний
    return content.map(c => ({ ...c, locked: c.isPremium }));
  }

  return content.map(c => {
    const hasAccess = !c.isPremium || user.subscriptionsRole?.includes(c.adminId);
    return { ...c, locked: !hasAccess };
  });
};

// 🔹 Приклад апгрейду та підписок
export const exampleFlow = () => {
  // користувач створюється як звичайний
  let user: User = {
    id: 'u1',
    email: 'test@gmail.com',
    firstName: 'Test',
    role: 'user',
    isAdmin: true,
    createdAt: new Date().toISOString(),
    subscriptionsRole: [],
  };

  // користувач створює продукт → апгрейд до адміна
  user = upgradeToAdmin(user);

  // новий користувач підписується на цього адміна
  const subscriber: User = {
    id: 'u2',
    email: 'sub@gmail.com',
    firstName: 'Sub',
    role: 'user',
    isAdmin: false,
    createdAt: new Date().toISOString(),
    subscriptionsRole: [user.id],
  };

  console.log(user, subscriber);
};
