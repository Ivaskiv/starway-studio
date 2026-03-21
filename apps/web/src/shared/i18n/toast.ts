// frontend/src/shared/utils/toast.utils.ts
export const TOAST_MESSAGES = {
  // Auth
  'auth.loginSuccess': { uk: 'Ви успішно увійшли', en: 'Login successful' },
  'auth.loginFailed': { uk: 'Помилка входу', en: 'Login failed' },
  'auth.loginInvalidCredentials': { uk: 'Невірні дані для входу', en: 'Invalid credentials' },
  'auth.registerSuccess': { uk: 'Реєстрацію завершено', en: 'Registration successful' },
  'auth.registerEmailExists': { uk: 'Email вже зареєстрований', en: 'Email already exists' },
  'auth.registerFailed': { uk: 'Помилка реєстрації', en: 'Registration failed' },
  'auth.logoutSuccess': { uk: 'Ви вийшли з системи', en: 'Logged out successfully' },
  'auth.autoLoginSuccess': { uk: 'Автоматично увійшли', en: 'Auto-login successful' },
  'auth.autoLoginFailed': { uk: 'Автовхід не вдався', en: 'Auto-login failed' },
  'auth.socialSuccess': { uk: 'Соцмережа підключена', en: 'Social login successful' },
  'auth.socialGoogleNotConfigured': { uk: 'Google не налаштований', en: 'Google login not configured' },
  'auth.socialGenericError': { uk: 'Не вдалося увійти через соцмережу', en: 'Social login failed' },
  'auth.forgotInvalidEmail': { uk: 'Введіть коректний email', en: 'Provide a valid email' },
  'auth.forgotEmailSent': { uk: 'Лист відправлено', en: 'Reset email sent' },
  'auth.forgotNoMailProvider': { uk: 'Перенаправляємо на сторінку скидання', en: 'Redirecting to reset page' },
  'auth.forgotGeneric': { uk: 'Перевірте пошту для подальших інструкцій', en: 'Check your email for next steps' },
  'auth.forgotFailed': { uk: 'Не вдалося надіслати лист', en: 'Failed to send reset email' },
  
  // Settings
  'settings.saveSuccess': { uk: 'Налаштування збережено', en: 'Settings saved successfully' },
  'settings.saveFailed': { uk: 'Не вдалося зберегти налаштування', en: 'Failed to save settings' },
  'settings.resetSuccess': { uk: 'Налаштування скинуто', en: 'Settings reset successfully' },

  // Module
  'module.moduleLocked': { uk: 'Ця функція доступна тільки в преміум', en: 'This feature is premium only' },
  'module.accessDenied': { uk: 'Доступ заборонено', en: 'Access denied' },
  'module.productNameRequired': { uk: 'Назва продукту обовʼязкова', en: 'Product name required' },
  'module.productCreated': { uk: 'Продукт створено', en: 'Product created' },
  'module.productCreateFailed': { uk: 'Не вдалося створити продукт', en: 'Product creation failed' },

  // Generic
  'generic.success': { uk: 'Успішно', en: 'Success' },
  'generic.error': { uk: 'Помилка', en: 'Error' },
  'generic.saved': { uk: 'Збережено', en: 'Saved' },
  'generic.deleted': { uk: 'Видалено', en: 'Deleted' },
} as const;

export type ToastKey = keyof typeof TOAST_MESSAGES;
export type ToastLang = 'uk' | 'en';

/**
 * Отримати текст для тосту
 */
export function getToastMessage(key: ToastKey, lang: ToastLang = 'uk'): string {
  return TOAST_MESSAGES[key]?.[lang] ?? TOAST_MESSAGES[key]?.['uk'] ?? key;
}
