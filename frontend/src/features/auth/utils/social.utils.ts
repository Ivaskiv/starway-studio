// Тут лишаємо тільки специфічні функції токенів
export async function getGoogleToken(): Promise<string> {
  const googleWindow = window as any;
  if (!googleWindow.google) throw new Error('Google API не завантажений');

  return new Promise((resolve, reject) => {
    const client = googleWindow.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      callback: (res: any) => res.access_token ? resolve(res.access_token) : reject(new Error('Не отримано токен')),
    });
    client.requestAccessToken();
  });
}

export async function getTelegramToken(): Promise<string> {
  // Вставити вашу реалізацію Telegram OAuth / login widget
  return new Promise((resolve, reject) => {
    const telegramWindow = window as any;
    // приклад:
    const token = telegramWindow?.Telegram?.WebApp?.initData?.auth_token;
    if (token) resolve(token);
    else reject(new Error('Не отримано Telegram токен'));
  });
}
