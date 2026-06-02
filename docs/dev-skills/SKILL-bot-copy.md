---
name: SKILL-bot-copy
description: >
  Використовуй цей скіл ЗАВЖДИ коли пишеш або редагуєш
  будь-який user-facing текст в Telegram боті.
  Весь copy → тільки в content/*.ts файлах.
  Handlers → нуль тексту.
---

# SKILL: Bot Copy — тон і стиль повідомлень бота

## Головне правило

Весь user-facing текст → content файли:
  backend/src/products/ab-system/content/abTest.focus.ts
  backend/src/products/ab-system/content/abTest.followups.ts
  backend/src/products/ab-system/content/abTest.results.ts
  backend/src/products/ab-system/content/abTest.faq.ts

Handlers → тільки логіка. Нуль inline тексту.

## Тон бота

Бот говорить від імені Наді та платформи ABSystem.
Тепло. Конкретно. Без технічного жаргону.

## БАН — ніколи не писати

| ❌ Технічне | ✅ Людське |
|---|---|
| «Передали коучу» | «Ми отримали твій запит» |
| «Помилка обробки» | «Щось пішло не так, ми розберемось» |
| «Callback не спрацював» | «Спробуй ще раз або напиши нам» |
| «Webhook» / «callback» | (не згадувати взагалі) |
| «Зверніться до підтримки» | «Напиши нам — розберемось разом» |
| «Підписка ФОКУС неактивна» | «Доступ до ФОКУСУ ще не активовано» |
| «Передали адміну» | «Ми перевіримо і напишемо» |

## Правила написання

- Від першої особи множини («ми») або нейтрально
- Максимум 3–4 речення на повідомлення
- Без зайвих вибачень («вибачте за незручності»)
- Без технічних деталей (id, hash, timestamp)
- Без маркетингових кліше («унікальна можливість»)
- Якщо помилка — не пояснювати чому, а що робити далі

## Шаблони по сценаріях

### Проблема з оплатою (юзер)
```typescript
export const FOCUS_PAYMENT_ISSUE_USER_MSG =
  'Дякуємо, що написала.\n\n' +
  'Ми отримали твій запит і зараз перевіряємо оплату.\n' +
  'Якщо все пройшло — відкриємо доступ найближчим часом.'
```

### Проблема з оплатою (коуч — внутрішнє)
```typescript
export const FOCUS_PAYMENT_ISSUE_COACH_MSG = (params: {
  userId: string
  orderReference: string
  amount: number
}) =>
  '💳 Учасниця повідомила про проблему з оплатою\n\n' +
  `Перевір WayForPay — чи пройшла оплата.\n` +
  `Сума: ${params.amount} грн\n` +
  `Якщо підтверджено — натисни кнопку нижче.`
```

### Підписка вже активна
```typescript
export const FOCUS_ALREADY_ACTIVE_MSG = (inviteUrl: string) =>
  '✅ <b>Твій доступ до ФОКУСУ активний.</b>\n\n' +
  (inviteUrl
    ? 'Закритий канал:\n' + inviteUrl + '\n\nПерейди і закріпи, щоб не загубити.'
    : 'Натисни кнопку нижче щоб відновити доступ.')
```

### Block 12 — після оплати (з ТЗ Блок 12)
```typescript
export const FOCUS_WELCOME_MSG = (inviteUrl: string) =>
  'Оплата пройшла. Вітаю, ти у ФОКУСІ.\n\n' +
  'Тут ми не будемо просто говорити про зміни.\n' +
  'Раз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію:\n' +
  '— що відкладаєш;\n' +
  '— чому переносиш;\n' +
  '— яке рішення не приймаєш;\n' +
  '— який крок треба зробити зараз.\n\n' +
  'Ось посилання на закритий канал:\n' +
  inviteUrl + '\n\n' +
  'Перейди і закріпи його, щоб не загубити.'
```

### Resend Block12 — успішно
```typescript
export const FOCUS_RESEND_SUCCESS_MSG =
  'Посилання на канал надіслано повторно.\n' +
  'Якщо не бачиш — перевір папку «Інше» в Telegram.'
```

### Resend Block12 — немає підписки
```typescript
export const FOCUS_RESEND_NO_SUB_MSG =
  'Доступ до ФОКУСУ ще не активовано.\n\n' +
  'Якщо ти вже оплатила — натисни «⚠️ Проблема з оплатою».\n' +
  'Ми перевіримо і відкриємо доступ.'
```

## Де живе copy — карта файлів

| Сценарій | Content файл | Константа |
|---|---|---|
| Після оплати (Block 12) | abTest.focus.ts | FOCUS_WELCOME_MSG |
| Підписка вже активна | abTest.focus.ts | FOCUS_ALREADY_ACTIVE_MSG |
| Проблема з оплатою (юзер) | abTest.focus.ts | FOCUS_PAYMENT_ISSUE_USER_MSG |
| Проблема з оплатою (коуч) | abTest.focus.ts | FOCUS_PAYMENT_ISSUE_COACH_MSG |
| Resend успішно | abTest.focus.ts | FOCUS_RESEND_SUCCESS_MSG |
| Resend — нема підписки | abTest.focus.ts | FOCUS_RESEND_NO_SUB_MSG |
| Дожими (24h/48h/72h/5d/7d) | abTest.followups.ts | DOJIM_TEXTS |
| Результати тесту (Блоки 4-8) | abTest.results.ts | AB_TEST_RESULTS |
