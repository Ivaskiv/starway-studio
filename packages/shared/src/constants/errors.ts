// shared/src/constants/errors.ts

// HTTP коди помилок
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// Коди помилок додатку
export enum ErrorCode {
  // Auth errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_EXISTS = 'AUTH_EMAIL_EXISTS',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_INVALID_DATA = 'USER_INVALID_DATA',
  
  // Funnel errors
  FUNNEL_NOT_FOUND = 'FUNNEL_NOT_FOUND',
  FUNNEL_INVALID_STEP = 'FUNNEL_INVALID_STEP',
  FUNNEL_STEP_NOT_FOUND = 'FUNNEL_STEP_NOT_FOUND',
  FUNNEL_CIRCULAR_DEPENDENCY = 'FUNNEL_CIRCULAR_DEPENDENCY',
  FUNNEL_LIMIT_REACHED = 'FUNNEL_LIMIT_REACHED',
  
  // Product errors
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
  
  // Payment errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_PROVIDER_ERROR = 'PAYMENT_PROVIDER_ERROR',
  
  // Subscription errors
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// Повідомлення помилок
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Невірний email або пароль',
  [ErrorCode.AUTH_EMAIL_EXISTS]: 'Користувач з таким email вже існує',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'Email не підтверджено',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Токен прострочено',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Невірний токен',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Необхідна авторизація',
  [ErrorCode.AUTH_FORBIDDEN]: 'Доступ заборонено',
  
  // User
  [ErrorCode.USER_NOT_FOUND]: 'Користувача не знайдено',
  [ErrorCode.USER_INACTIVE]: 'Обліковий запис неактивний',
  [ErrorCode.USER_SUSPENDED]: 'Обліковий запис заблоковано',
  [ErrorCode.USER_INVALID_DATA]: 'Невірні дані користувача',
  
  // Funnel
  [ErrorCode.FUNNEL_NOT_FOUND]: 'Воронку не знайдено',
  [ErrorCode.FUNNEL_INVALID_STEP]: 'Невірний крок воронки',
  [ErrorCode.FUNNEL_STEP_NOT_FOUND]: 'Крок воронки не знайдено',
  [ErrorCode.FUNNEL_CIRCULAR_DEPENDENCY]: 'Виявлено циклічну залежність кроків',
  [ErrorCode.FUNNEL_LIMIT_REACHED]: 'Досягнуто ліміт воронок для вашого тарифу',
  
  // Product
  [ErrorCode.PRODUCT_NOT_FOUND]: 'Продукт не знайдено',
  [ErrorCode.PRODUCT_UNAVAILABLE]: 'Продукт недоступний',
  
  // Payment
  [ErrorCode.PAYMENT_FAILED]: 'Помилка оплати',
  [ErrorCode.PAYMENT_CANCELLED]: 'Оплату скасовано',
  [ErrorCode.PAYMENT_PROVIDER_ERROR]: 'Помилка платіжної системи',
  
  // Subscription
  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'Підписку не знайдено',
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Підписка прострочена',
  [ErrorCode.SUBSCRIPTION_CANCELLED]: 'Підписку скасовано',
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Помилка валідації даних',
  [ErrorCode.INVALID_INPUT]: 'Невірні вхідні дані',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Відсутнє обов\'язкове поле',
  
  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Перевищено ліміт запитів. Спробуйте пізніше',
  
  // Server
  [ErrorCode.INTERNAL_ERROR]: 'Внутрішня помилка сервера',
  [ErrorCode.DATABASE_ERROR]: 'Помилка бази даних',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Помилка зовнішнього сервісу',
};

// Клас помилки додатку
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    message?: string,
    public details?: any
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'AppError';
  }
}

// Helper функції для створення помилок
export const createError = (
  code: ErrorCode,
  statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  details?: any
): AppError => {
  return new AppError(code, statusCode, ERROR_MESSAGES[code], details);
};

export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};