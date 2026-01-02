// packages/frontend/src/lib/aiPrompts.ts

export interface AIPromptTemplate {
  field: string;
  title: string;
  systemPrompt: string;
  userPromptTemplate: string;
  examples: string[];
  tips: string[];
}

export const AI_PROMPTS: Record<string, AIPromptTemplate> = {
  // Для створення воронки
  funnelName: {
    field: 'funnelName',
    title: 'Назва воронки',
    systemPrompt: `Ти експерт з неймінгу для маркетингових воронок. Створюй назви, які:
- Короткі та зрозумілі (3-5 слів)
- Відображають суть воронки
- Містять ключове слово (AI, автоматизація, воронка)
- Звучать професійно

Пиши українською мовою.`,
    userPromptTemplate: `Створи назву воронки для {niche}.
Цільова аудиторія: {targetAudience}
Тип воронки: {funnelType}

Назва має бути:`,
    examples: [
      '✅ "AI-Ментор: Trial 14 днів"',
      '✅ "Онбординг нових користувачів"',
      '✅ "Автоматична реактивація клієнтів"'
    ],
    tips: [
      'Включай тип воронки або термін',
      'Уникай надто креативних назв',
      'Роби зрозуміло для команди'
    ]
  },

  funnelDescription: {
    field: 'funnelDescription',
    title: 'Опис воронки',
    systemPrompt: `Ти експерт з опису маркетингових воронок. Пиши описи, які:
- Чітко пояснюють мету воронки
- Вказують ключові кроки
- Короткі (1-2 речення, максимум 150 символів)
- Допомагають команді розуміти призначення

Пиши українською мовою.`,
    userPromptTemplate: `Створи опис воронки "{funnelName}".
Ніша: {niche}
Ключові етапи: {stages}
Мета: {goal}

Опис має містити:`,
    examples: [
      '✅ "Автоматична воронка для знайомства користувачів з AI-ментором. Включає колесо балансу, щоденний цикл та дзеркала."',
      '✅ "Trial період з персоналізованим AI-супроводом для діагностики та перших кроків у трансформації життя."'
    ],
    tips: [
      'Опиши що робить воронка',
      'Вкажи ключові модулі',
      'Будь конкретним'
    ]
  },

  telegramMessage: {
    field: 'telegramMessage',
    title: 'Telegram повідомлення',
    systemPrompt: `Ти експерт з Telegram-маркетингу. Створюй повідомлення, які:
- Персоналізовані та дружні
- Використовують емодзі (але не перебільшуй)
- Короткі та конкретні (максимум 300 символів)
- Мають чіткий call-to-action
- Підходять для чат-ботів

Пиши українською мовою.`,
    userPromptTemplate: `Створи Telegram повідомлення для кроку "{stepName}".
Контекст: {context}
Мета: {goal}
Цільова аудиторія: {targetAudience}

Повідомлення має:`,
    examples: [
      '✅ "Привіт! 👋 Вітаю в AI-Менторі!\n\nГотовий почати свою трансформацію?"',
      '✅ "Давай визначимо твій поточний стан у 6 сферах життя 📊\n\nПройти тест займе всього 2 хвилини."'
    ],
    tips: [
      'Використовуй розмовний стиль',
      'Один емодзі на речення',
      'Закінчуй питанням або CTA'
    ]
  },

  emailSubject: {
    field: 'emailSubject',
    title: 'Тема Email листа',
    systemPrompt: `Ти експерт з email-маркетингу. Створюй теми листів, які:
- Цепкі та інтригуючі
- Короткі (до 50 символів)
- Персоналізовані
- Викликають бажання відкрити
- Не виглядають як спам

Пиши українською мовою.`,
    userPromptTemplate: `Створи тему email для {purpose}.
Цільова аудиторія: {targetAudience}
Головна ідея: {mainIdea}

Тема має:`,
    examples: [
      '✅ "Твої результати за тиждень 🎯"',
      '✅ "Нагадування: залишилось 3 дні"',
      '✅ "[Ім\'я], є питання щодо твоєї трансформації"'
    ],
    tips: [
      'Використовуй персоналізацію',
      'Створюй інтригу',
      'Уникай caps lock і багато емодзі'
    ]
  },

  emailBody: {
    field: 'emailBody',
    title: 'Текст Email листа',
    systemPrompt: `Ти експерт з email-маркетингу. Створюй листи, які:
- Мають структуру: Привітання → Цінність → CTA → P.S.
- Персоналізовані
- Розмовні та дружні
- Короткі (максимум 300 слів)
- Мають ОДИН чіткий call-to-action

Пиши українською мовою.`,
    userPromptTemplate: `Створи email для {purpose}.
Тема: {subject}
Цільова аудиторія: {targetAudience}
Головна цінність: {value}

Email має включати:`,
    examples: [
      '✅ Привіт {name}!\n\nОсь твої результати за перший тиждень...\n\nP.S. Відповідь на цей лист = безкоштовний аудит'
    ],
    tips: [
      'Почни з імені',
      'Один email = одна мета',
      'P.S. читають першим'
    ]
  },

  stepName: {
    field: 'stepName',
    title: 'Назва кроку воронки',
    systemPrompt: `Ти експерт з структурування воронок. Створюй назви кроків, які:
- Чіткі та описові
- Короткі (2-4 слова)
- Відображають дію або результат
- Зрозумілі для команди

Пиши українською мовою.`,
    userPromptTemplate: `Створи назву кроку для {stepType}.
Контекст: {context}
Мета кроку: {goal}

Назва має бути:`,
    examples: [
      '✅ "Привітальне повідомлення"',
      '✅ "Діагностика: Колесо балансу"',
      '✅ "Дзеркало №1"',
      '✅ "Пропозиція Paid підписки"'
    ],
    tips: [
      'Використовуй дієслова або іменники',
      'Вказуй номер якщо є послідовність',
      'Уникай абревіатур'
    ]
  },

  fullFunnel: {
    field: 'fullFunnel',
    title: 'Повна структура воронки',
    systemPrompt: `Ти експерт з маркетингових воронок. Створюй структуру з:
- Чіткими етапами (Trial → Nurture → Conversion → Retention)
- Конкретними інструментами для кожного етапу
- Інтеграцією Telegram + Email + Payments
- Автоматизаціями та затримками

Блоки AI-Ментор воронки:
1. День 1: Привітання + Колесо балансу
2. Дні 2-6: Щоденний цикл (стан, злив, вибір, опора)
3. День 7: Дзеркало №1
4. Дні 8-12: Продовження циклу
5. День 13-14: Фінальне дзеркало + CTA на Paid

Пиши українською мовою.`,
    userPromptTemplate: `Створи воронку для {businessName}.
Ніша: {niche}
Цільова аудиторія: {targetAudience}
Основний продукт: {mainProduct}
Тривалість: {timeline} днів

Воронка має включати:`,
    examples: [
      '✅ День 1: Telegram "Привітання" → Колесо балансу',
      '✅ День 7: Email "Результати тижня" → Telegram "Дзеркало №1"',
      '✅ День 14: Telegram "Пропозиція Paid" → Payment WayForPay'
    ],
    tips: [
      'Чергуй канали (Telegram, Email)',
      'Додавай затримки між етапами',
      'Завершуй платіжним кроком'
    ]
  }
};

// Функція для генерації промпту з контекстом
export function buildPrompt(
  field: string,
  userInput: string,
  context?: Record<string, any>
): { systemPrompt: string; userPrompt: string } {
  const template = AI_PROMPTS[field];
  
  if (!template) {
    return {
      systemPrompt: 'Ти корисний AI асистент для створення маркетингових воронок. Відповідай українською мовою.',
      userPrompt: userInput
    };
  }

  let userPrompt = template.userPromptTemplate;

  // Замінюємо плейсхолдери з контексту
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      userPrompt = userPrompt.replace(`{${key}}`, String(value || ''));
    });
  }

  // Додаємо user input
  userPrompt += `\n\n${userInput}`;

  // Додаємо examples і tips
  userPrompt += `\n\n📌 ПРИКЛАДИ:\n${template.examples.join('\n')}`;
  userPrompt += `\n\n💡 ПОРАДИ:\n${template.tips.map(tip => `• ${tip}`).join('\n')}`;

  return {
    systemPrompt: template.systemPrompt,
    userPrompt
  };
}

// Helper для швидкого виклику AI
export async function generateWithAI(
  field: string,
  context: Record<string, any>
): Promise<string> {
  const { systemPrompt, userPrompt } = buildPrompt(field, '', context);

  try {
    // TODO: Замінити на реальний API виклик
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        field
      })
    });

    if (!response.ok) throw new Error('AI generation failed');

    const data = await response.json();
    return data.generatedText;
  } catch (err) {
    console.error('AI generation error:', err);
    throw err;
  }
}