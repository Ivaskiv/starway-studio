import { toast } from '@/shared/Toast';

type WheelToastKey =
  | 'limitReached'
  | 'scoreRequired'
  | 'saved'
  | 'saveError'
  | 'missingUser';

const MESSAGES: Record<WheelToastKey, string> = {
  limitReached: 'Ліміт генерацій вичерпано (3/3).',
  scoreRequired: 'Оберіть оцінку від 1 до 10, щоб продовжити.',
  saved: 'Колесо балансу збережено.',
  saveError: 'Не вдалося зберегти результат. Спробуйте ще раз.',
  missingUser: 'Не вдалося визначити користувача. Оновіть сторінку.',
};

export const wheelToast = {
  success: (key: Extract<WheelToastKey, 'saved'>) => toast.success(MESSAGES[key]),
  error: (key: Exclude<WheelToastKey, 'saved'>, fallback?: string) =>
    toast.error(fallback || MESSAGES[key]),
};
