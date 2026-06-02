# SKILL: Авторизація + Telegram WebApp routing

> Статус: ACTIVE — створено після діагностики розсинхрону (2026-05-29)

## Проблема яку вирішує цей скіл

Telegram WebApp кнопка (`Markup.button.webApp(url)`) відкриває URL
всередині Telegram. Якщо URL веде на основний сайт (лендінг/дашборд)
а не на конкретний Mini App — користувач бачить не той екран.

**Симптом:** коуч натискає "📅 Мій розклад" → відкривається лендінг платформи.
**Причина:** `WEBAPP_URL` = корінь сайту, або route не існує.

---

## Архітектура WebApp авторизації

```
Telegram кнопка webApp(url)
        ↓
Mini App HTML (статичний файл або окремий route)
        ↓
Telegram.WebApp.initData → передається в header Authorization
        ↓
backend validateInitData(initData, BOT_TOKEN)
        ↓
Якщо valid → повернути дані
Якщо invalid → 401
```

---

## Правила (незмінні)

### 1. URL для кожного Mini App — точний шлях
```ts
// ❌ Неправильно:
Markup.button.webApp('📅 Розклад', process.env.WEBAPP_URL)
// → відкриє корінь сайту

// ✅ Правильно:
Markup.button.webApp('📅 Розклад',
  `${process.env.WEBAPP_URL}/coach-schedule.html`)
// → відкриє конкретний файл
```

### 2. Кожен Mini App = окремий HTML файл в apps/web/public/
```
apps/web/public/
  coach-schedule.html    ← розклад коуча
  coach-analytics.html   ← аналітика (майбутнє)
  zoom-booking.html      ← запис учасника (майбутнє)
```
Vite автоматично публікує `public/` як статику на Vercel.
URL: `https://your-app.vercel.app/coach-schedule.html`

### 3. Перевірка initData — обов'язкова на кожному API endpoint
```ts
// backend/src/lib/telegram-webapp.ts
import * as crypto from 'crypto'

export function validateInitData(
  initData: string,
  botToken: string
): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false
  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  return expected === hash
}

export function getTelegramUserFromInitData(
  initData: string
): { id: number; username?: string } | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}
```

### 4. Mini App HTML — обов'язковий шаблон
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  const tg = window.Telegram.WebApp
  tg.ready()
  tg.expand()

  // Авторизація через initData
  const initData = tg.initData
  if (!initData) {
    // Відкрито не з Telegram — показати помилку
    document.body.innerHTML = '<p>Відкрий з Telegram</p>'
  }

  // Всі API запити з initData в header
  async function apiCall(path, method = 'GET', body) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
      },
      body: body ? JSON.stringify(body) : undefined
    })
    if (res.status === 401) {
      tg.showAlert('Доступ заборонено')
      return null
    }
    return res.json()
  }
</script>
```

### 5. Backend middleware для WebApp routes
```ts
// backend/src/middleware/telegramWebApp.middleware.ts
export async function telegramWebAppAuth(
  req: Request, res: Response, next: NextFunction
) {
  const initData = req.headers['x-telegram-init-data'] as string
  if (!initData) return res.status(401).json({ error: 'no_init_data' })

  const isValid = validateInitData(initData, process.env.COACH_BOT_TOKEN!)
  if (!isValid) return res.status(401).json({ error: 'invalid_init_data' })

  const tgUser = getTelegramUserFromInitData(initData)
  if (!tgUser) return res.status(401).json({ error: 'no_user' })

  // Перевірити роль в БД
  const user = await prisma.user.findFirst({
    where: { telegramUserId: tgUser.id.toString() },
    select: { id: true, role: true }
  })
  if (!user || !['EXPERT','SUPERADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  req.coachUser = user
  next()
}
```

---

## .env змінні

```env
WEBAPP_URL=https://your-app.vercel.app
# Без trailing slash!
# Mini App URL = WEBAPP_URL + /coach-schedule.html
```

## Чекліст при додаванні нового Mini App

```
[ ] Файл в apps/web/public/NAME.html
[ ] Telegram.WebApp.ready() + tg.expand() на початку
[ ] initData перевіряється (не порожній)
[ ] Всі fetch запити з header X-Telegram-Init-Data
[ ] Backend route захищений telegramWebAppAuth middleware
[ ] WEBAPP_URL в .env вказує на Vercel (без trailing slash)
[ ] Кнопка: Markup.button.webApp('Назва', WEBAPP_URL + '/NAME.html')
[ ] Перевірити що файл доступний: curl WEBAPP_URL/NAME.html
```

## Типові помилки

| Симптом | Причина | Фікс |
|---|---|---|
| Відкривається лендінг замість Mini App | URL без шляху до файлу | Додати `/coach-schedule.html` до WEBAPP_URL |
| 401 від API | initData не передається | Додати header X-Telegram-Init-Data |
| Білий екран | Файл не в public/ або Vite не зібраний | Перевірити apps/web/public/ + redeploy |
| "Відкрий з Telegram" на десктопі | Тест не через Telegram | Нормально — Mini App тільки в Telegram |