import { ukToast } from '@/shared/i18n/translations/uk';

type ToastDict = typeof ukToast;
type ToastLang = 'uk';
type ToastKey =
  | 'auth.loginSuccess'
  | 'auth.loginInvalidCredentials'
  | 'auth.loginFailed'
  | 'auth.registerSuccess'
  | 'auth.registerEmailExists'
  | 'auth.registerFailed'
  | 'auth.forgotInvalidEmail'
  | 'auth.forgotEmailSent'
  | 'auth.forgotNoMailProvider'
  | 'auth.forgotGeneric'
  | 'auth.forgotFailed'
  | 'auth.socialSuccess'
  | 'auth.socialGenericError'
  | 'auth.socialGoogleNotConfigured'
  | 'auth.autoLoginSuccess'
  | 'auth.autoLoginFailed'
  | 'auth.resetNeedToken'
  | 'auth.resetPasswordMinLen'
  | 'auth.resetPasswordsMismatch'
  | 'auth.resetSuccess'
  | 'auth.resetTokenInvalid'
  | 'auth.resetFailed'
  | 'auth.userNotRegistered'
  | 'module.productNameRequired'
  | 'module.productCreated'
  | 'module.productCreateFailed'
  | 'module.moduleLocked';

const TOAST_DICT: Record<ToastLang, ToastDict> = {
  uk: ukToast,
};

export function resolveToastLang(userLanguage?: string | null): ToastLang {
  return userLanguage === 'uk' ? 'uk' : 'uk';
}

export function getToastMessage(
  key: ToastKey,
  userLanguage?: string | null,
): string {
  const lang = resolveToastLang(userLanguage);
  const [scope, name] = key.split('.') as [keyof ToastDict, string];
  const scopeDict = TOAST_DICT[lang][scope] as Record<string, string>;
  return scopeDict[name] ?? key;
}
