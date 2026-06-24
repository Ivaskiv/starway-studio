//backend/src/products/absystem/config/absystem.content.ts
import type { RelationshipMemoryProfile, RelationshipTrustProgression } from '../../../core/memory/relationshipMemory.js'
import { buildBehavioralNarrative } from '../../../core/behavioral/behavioralNarrative.js'

export const AB_TEST_START_INTRO = [
  'Привіт.',
  '',
  'Це тест AB System: <b>Чому ти відкладаєш те що давно хочеш зробити?</b>',
  '',
  'Він допоможе побачити чому ти знову переносиш важливе і <b>з чого почати</b>.',
  '',
  'Тут не буде складних питань. Просто відповідай так як є зараз.',
].join('\n')

export const AB_TEST_START_STEP2 = [
  'У тесті буде 8 питань.',
  '',
  'Обирай той варіант який найбільше схожий на тебе зараз.',
  '',
  'Не треба відповідати "правильно". Треба чесно.',
].join('\n')

export const absystemContent = {
  meta: {
    productId: 'absystem',
    productName: 'ABSystem',
    tone: 'human-first',
  },
  START_BLOCK1: {
    MSG1: AB_TEST_START_INTRO,
    MSG2: AB_TEST_START_STEP2,
    MSG3: [
      'Ти вже тут.',
      '',
      'Натисни "Пройти тест", щоб почати.',
    ].join('\n'),
    CTA1: 'Почати тест',
    CTA_CHAT: '💬 Продовжити тут',
    CTA_MINIAPP: '📱 Відкрити в MiniApp',
    CTA_BROWSER: '🌐 В браузері',
  },
  RESUME_FLOW: {
    IN_PROGRESS: (n: number) =>
      `Ти вже відповіла на ${n} з 8 питань.\nПродовжити з того місця де зупинилась?`,
    STALE_PROGRESS: (n: number, days: number) =>
      `Ти відповіла на ${n} з 8 питань ${days} днів тому.\nТвої відчуття могли змінитися. Продовжити чи пройти заново?`,
    COMPLETED: (resultType: string) =>
      `Ти вже пройшла тест.\n*Результат:* *${resultType}*\n\nМожеш переглянути результат або пройти заново.`,
    CTA_CONTINUE: '▶️ Продовжити',
    CTA_RESTART: '🔄 Пройти заново',
    CTA_SHOW_RESULT: '📊 Показати результат',
    EDIT_OPENING: 'Відкриваю питання',
  },
  RESULT_TYPE_LABELS: {
    STATE: 'СТАН',
    GOAL: 'ЦІЛЬ',
    CHOICE: 'ВИБІР',
    DECISION: 'РІШЕННЯ',
    ACTION: 'ДІЯ',
  } as const,
  START_FLOWS: {
    FIRST_TIME_USER: {
      text: AB_TEST_START_INTRO,
      cta: 'Почати тест',
    },
    POST_TEST: {
      text: 'Ти вже побачила, де саме зупиняється твій рух. Це важливий крок. ФОКУС — це закритий простір, де ми раз на тиждень через живу практику працюємо саме з цією точкою. Без загальних порад — тільки твоя реальна ситуація.',
      cta: 'Хочу у ФОКУС',
    },
    FOCUS_PARTICIPANT: {
      text: 'Ти вже відчула, як працює система на Zoom. Між практиками проходить тиждень — і саме там рух часто зупиняється. ABSystem AI — це щоденна система, яка не дає тобі загубити ціль, рішення і дію між Zoom.',
      cta: 'Перейти в ABSystem AI',
    },
    ACTIVE_PLATFORM: {
      text: (lastGoal: string) => `З поверненням. Ти фіксувала: «${lastGoal}». Сьогодні важливо повернутись до рішення, яке ти вже прийняла — і до кроку, який просуне тебе далі.`,
      cta: 'Відкрити щоденний цикл',
    },
    DAILY_GAP: {
      text: 'Ми не втратили твій контекст. Ти зупинилась на конкретній точці — і саме звідти можна продовжити. Не спочатку. Просто повернутись.',
      cta: 'Продовжити',
    },
    MEDIUM_GAP: {
      text: 'Пауза — це частина будь-якого руху. Ти вже бачила свої повторювані точки зупинки. Давай подивимось, де ти зараз і що найважливіше повернути в фокус.',
      cta: 'Де я зараз',
    },
    LONG_GAP: {
      text: 'Ти повернулась. Це вже рішення. Ми бачимо твій шлях — колесо балансу, цілі, які ти ставила, рішення, які ти фіксувала. Давай зберемо картину знову — і зайдемо туди, де рух має продовжитись.',
      cta: 'Зібрати картину',
    },
    REPEATED_ROLLBACK: {
      text: (action: string) => `Ти вже кілька разів переносила «${action}». Це не слабкість — це сигнал, що десь раніше в ланцюжку є крок, який не зафіксований. Давай знайдемо його.`,
      cta: 'Розібрати',
    },
  },
  COMEBACK_FLOWS: {
    GAP_1_3: {
      text: 'Ти ще в потоці. Сьогоднішній щоденний цикл — один крок, щоб не втратити ритм.',
      cta: 'Продовжити',
      ctaUrl: '/dashboard/cycle',
    },
    GAP_4_7: {
      text: 'Ти зупинилась на кілька днів. Це нормально. Повертатись не означає починати спочатку — просто повернутись до свого кроку.',
      cta: 'Повернутись до кроку',
      ctaUrl: '/dashboard/cycle',
    },
    GAP_7_14: (action: string) => ({
      text: `Минуло майже два тижні. Ми памʼятаємо, де ти зупинилась. «${action}» — звідти і продовжимо.`,
      cta: 'Розібрати вузол',
      ctaUrl: '/dashboard/cycle',
    }),
    GAP_30_PLUS: {
      text: 'Пауза буває. Головне, що ти повернулась. Твої цілі і картина нікуди не зникли. Давай подивимось, що змінилось — і де зараз твоя точка входу.',
      cta: 'Зібрати картину',
      ctaUrl: '/dashboard',
    },
    GAP_30_NO_SUB: {
      text: 'Твій доступ призупинено. Але твої дані, цілі і карта балансу збережені. Коли будеш готова — все буде тут.',
      cta: 'Відновити доступ',
      ctaUrl: '/dashboard/subscription',
    },
  },
  INTERRUPTION_RECOVERY: {
    DAILY_INCOMPLETE: {
      text: 'Ти починала ранковий цикл. Хочеш завершити — або перейдемо одразу до головного кроку на сьогодні?',
      cta: 'Продовжити',
      ctaUrl: '/dashboard/cycle',
    },
    STALE_CALLBACK: {
      text: '',
      cta: 'Відкрити актуальне',
      ctaUrl: '/dashboard',
    },
    WHEEL_INCOMPLETE: (n: number) => ({
      text: `Ти вже оцінила ${n} з 8 сфер. Продовжимо звідти?`,
      cta: 'Продовжити колесо',
      ctaUrl: '/dashboard/wheel',
    }),
    GOALS_INCOMPLETE: (n: number, remaining: number) => ({
      text: `Ти вже прописала ${n} цілей. Залишилось ${remaining}. Продовжимо?`,
      cta: 'Продовжити цілі',
      ctaUrl: '/dashboard/goals',
    }),
  },
  buttons: {
    continue: '▶️ Продовжити',
    continueConversation: '▶️ Продовжити розмову',
    restore: '♻️ Повернутись',
    resume: '↩️ Продовжити з останнього кроку',
    openFocus: '🎯 Відкрити Focus',
    openAiMentor: '💬 Відкрити розмову',
    openZoom: '🕒 Відкрити Zoom',
    openPlatform: '🚀 Відкрити наступний крок',
    pay: '💳 Продовжити доступ',
    start: '✨ Почати',
    checkRhythm: '✨ Подивитись 7 днів',
    retry: 'Спробувати ще раз',
    backToFlow: 'Повернутись у рух',
  },
  commands: {
    privacy: 'Політика конфіденційності чат-бота',
  },
  onboarding: {
    title: 'Починаємо з простого',
    intro: [
      'Тут ми не обговорюємо систему — ми просто рухаємось крок за кроком.',
      'Відповідай чесно і коротко, а я підхоплю наступний рух.',
    ],
    resume: [
      'Ми вже були на цьому шляху.',
      'Повертаю тебе до останнього збереженого кроку.',
    ],
  },
  start: {
    title: 'ABSystem',
    firstEntry: [
      'Тут ми зберемо твій рух без зайвого шуму.',
      'Почнемо з одного зрозумілого кроку.',
    ],
    afterTest: [
      'Ти вже почала збирати свій рух в ABSystem.',
      'Повертаємось до точки, де є сенс продовжити.',
    ],
    afterFocus: [
      'Ти вже працювала у Focus.',
      'Тепер важливо не втратити цей рух.',
    ],
    afterInactivity: (days: number) => [
      `Я пам’ятаю твою історію після ${days} дн. паузи.`,
      'Повертаюсь до точки, де рух зупинився.',
    ],
    afterLongGap: [
      'Пауза була довшою, але нитка не обірвалась.',
      'Повертаємось без старту з нуля.',
    ],
    afterUnresolvedGoal: (goal: string) => [
      `Минулого разу твій важливий фокус був: ${goal}.`,
      'Зараз достатньо повернутись до цієї точки.',
    ],
    afterRepeatedAction: (action: string) => [
      `Ти вже повертався/лася до цього вузла: ${action}.`,
      'Підхопимо саме цю дію м’яко і без тиску.',
    ],
    afterActive: [
      'Ти вже в робочому русі.',
      'Продовжимо з останнього незавершеного руху.',
    ],
    cta: {
      start: '✨ Почати з першого кроку',
      continue: '↩️ Продовжити з історіяу',
      focus: '🎯 Повернутись у Focus',
      mentor: '💬 Продовжити розмову',
      platform: '🚀 Перейти далі',
    },
  },
  resume: {
    title: 'Історія збережена',
    body: [
      'Можеш продовжити з того місця, де зупинився/лася.',
      'Нічого не загубилося.',
    ],
  },
  continuity: {
    title: 'Ми вже бачили цей запит',
    lead: 'Повертаємося до твого історіяу без початку з нуля.',
    repeatGoal: (goal: string) => `Останній важливий фокус: ${goal}.`,
    repeatAction: (action: string) => `Минулого разу ти зупинився/лася саме на цьому кроці: ${action}.`,
    returnGap: (days: number) => `Повернення після ${days} дн. паузи.`,
    remembered: 'Я зберіг твій історія.',
  },
  recovery: {
    title: 'Повертаю тебе до актуального кроку',
    body: 'Продовжуємо з останнього збереженого місця.',
  },
  interruption: {
    title: 'Рух перервався',
    body: 'Повертаю тебе до найближчої зрозумілої дії.',
  },
  staleCallbacks: {
    title: 'Цей крок уже оновлено',
    body: 'Відкриваю актуальний стан без втрати історіяу.',
  },
  inactivityReturn: {
    title: 'Рада знову бачити тебе тут',
    body: 'Ми збережемо історія і повернемось до потрібного кроку.',
  },
  rhythmReturn: {
    title: 'Повертаємо твій рух',
    body: 'Підхоплюю з того місця, де ти зупинився/лася.',
  },
  focus: {
    title: 'Focus',
    onboarding: [
      'Ти вже всередині практикуму.',
      'Можемо продовжити з найближчого кроку без зайвого шуму.',
    ],
    zoomPrep: [
      'Скоро Zoom.',
      'Підготуйся до короткої розмови: вона допоможе не втратити напрям.',
    ],
    postZoomReflection: [
      'Після Zoom найкраще не розбігатися по нових думках.',
      'Зараз важливо зафіксувати один конкретний висновок.',
    ],
    weeklyFixation: [
      'Щотижня ми збираємо картину в один ясний крок.',
      'Нам важливо не втратити те, що вже стало зрозумілим.',
    ],
    accountability: [
      'Твій наступний крок уже видно.',
      'Я допоможу тримати його в полі уваги без тиску.',
    ],
    bridge: [
      'Коли дія тримається, можна переходити далі.',
      'Спершу — стабільність, потім — наступний крок.',
    ],
    missedZoomRecovery: [
      'Zoom можна пропустити, але історія не губиться.',
      'Повертаю тебе до найближчого кроку.',
    ],
    completionContinuity: [
      'Ти вже пройшов/пройшла важливу частину.',
      'Продовжимо без втрати інерції.',
    ],
  },
  aiMentor: {
    opening: 'Можемо розібрати саме те, що зараз найбільше просить уваги.',
    reentry: 'Ми вже знаємо твій історія. Продовжимо з нього.',
    prompt: 'Напиши, що зараз найбільше заважає рухатись далі.',
    next: 'Найкращий наступний крок уже поруч.',
  },
  AI_MENTOR: {
    FIRST_ENTRY: {
      text: 'Я тут щоб допомогти тобі думати чіткіше — не давати готові відповіді, а ставити правильні питання. Що зараз найважливіше для тебе?',
      cta: 'Почати розмову',
    },
    RETURN_WITH_CONTEXT: {
      text: (topic: string) => `З поверненням. Минулого разу ти говорила про «${topic}». Що змінилось?`,
      cta: 'Продовжити розмову',
    },
    STUCK_AT_POINT: {
      text: 'Ти вже кілька разів підходила до цього рішення. Давай подивимось, що конкретно тебе зупиняє — не загально, а в цій конкретній ситуації.',
      cta: 'Розібрати вузол',
    },
  },
  zoom: {
    title: 'Zoom',
    prep: 'Перед Zoom важливо мати один ясний намір.',
    reminder: 'Zoom скоро. Не треба готувати все одразу — лише головну думку.',
    missed: 'Zoom можна повернути в наступну дію без втрати історіяу.',
    attended: 'Після Zoom ми зафіксуємо головне і не розпорошимось.',
  },
  dailyCycle: {
    command: {
      missingProfile: 'Поки що не можу знайти твій активний доступ.',
      accessDenied: 'Зараз Daily недоступний. Продовжимо, щойно доступ повернеться.',
      open: 'Відкрити Daily',
      webApp: 'Відкрити у веб-додатку',
    },
    morning: '🌅 Ранок уже відкрився. Зайди в Daily, щоб м’яко зібрати день.',
    evening: '🌙 День ще можна зібрати. Заверши Daily, щоб не втратити напрям.',
  },
  tasks: {
    title: 'Твої завдання',
    empty: 'Зараз немає активних завдань. Можемо повернутись до наступного кроку.',
    summary: (active: number, completed: number, missed: number) => {
      const parts: string[] = []
      if (active > 0) {
        parts.push(active === 1 ? 'Є один відкритий крок.' : 'Є кілька відкритих кроків.')
      }
      if (completed > 0) {
        parts.push('Частину вже завершено.')
      }
      if (missed > 0) {
        parts.push('Є кроки, які краще не відкладати.')
      }
      return parts.length > 0
        ? parts.join(' ')
        : 'Зараз немає активних завдань. Можемо повернутись до наступного кроку.'
    },
    taskPrefix: 'Крок',
    completed: 'Завдання виконано. Я підхопив наступний крок.',
    retry: 'Не вдалося зберегти зараз. Спробуй ще раз за мить.',
    backToRhythm: 'Повернутись до руху',
    rhythmCheck: 'Перевірити 7 днів',
    myStatus: 'Мій стан',
  },
  fallback: {
    morningFailed: 'Не вдалося запустити ранкову сесію.',
    eveningFailed: 'Не вдалося запустити вечірню сесію.',
  },
  subscription: {
    title: 'Доступ і рух',
    active: 'Ти вже всередині системи.',
    trial: 'У тебе зараз пробний доступ.',
    paused: 'Доступ на паузі, але історія збережено.',
    expired: 'Доступ завершився, та історія не втрачено.',
    restore: 'Повертаємо доступ і продовжуємо з останньої точки.',
  },
  upgrade: {
    title: 'Наступний крок',
    ready: 'Для тебе вже доступний наступний крок.',
    focusToAi: 'Після Focus відкривається наступний крок розмови.',
    stateCourse: 'Зараз корисно спершу стабілізувати рух.',
    strategicSession: 'Можна переходити до глибшої розмови.',
    personalProgram: 'Тут уже є готовність до персонального супроводу.',
  },
  UPGRADE_FLOWS: {
    FOCUS_TO_AI_SOFT_TITLE: '🚀 ABSystem AI після Zoom',
    FOCUS_TO_AI_SOFT: 'На Zoom ти вже побачила свою точку зупинки. Але між практиками — 7 днів. Саме там рух часто зникає. ABSystem AI — це те, що тримає твій фокус щодня між Zoom.',
    FOCUS_TO_AI_SOFT_CTA: 'Перейти в ABSystem AI',
    FOCUS_TO_AI_HARD_TITLE: '🚀 ABSystem AI наступний крок',
    FOCUS_TO_AI_HARD: 'Ти вже 4 тижні у ФОКУСІ. ABSystem AI — наступний рівень: щоденна підтримка між практиками. Доплата — 1120 грн (твій ФОКУС зараховується).',
    FOCUS_TO_AI_HARD_CTA: 'Перейти в ABSystem AI',
    TO_STATE_COURSE_TITLE: '📚 Програма стану',
    TO_STATE_COURSE: 'Ти вже кілька разів фіксувала, що дія зривається не через відсутність рішення — а через стан. Для цього є окрема програма.\n990 грн для учасника ФОКУСУ/платформи.',
    TO_STATE_COURSE_CTA: 'Подивитись програму',
    WAITLIST_SESSION_TITLE: '🕊️ Лист очікування на сесію',
    WAITLIST_SESSION: 'Якщо твоя ситуація потребує персонального погляду — можна залишити заявку в лист очікування на стратегічну сесію.\n150 €',
    WAITLIST_SESSION_CTA: 'Залишити заявку',
    WAITLIST_PERSONAL_TITLE: '💎 Персональний супровід',
    WAITLIST_PERSONAL: 'Я беру до 5 людей на місяць у персональний супровід. Якщо ти в ФОКУСІ або платформі і розумієш, що тобі потрібна моя пряма участь — залиши заявку.',
    WAITLIST_PERSONAL_CTA: 'Залишити заявку',
  },
  retention: {
    title: 'Повернення в рух',
    gentle: 'Ми збережемо історія і не будемо тиснути.',
    pattern: 'Схоже, ти вже поверталась до цього запиту раніше.',
    nextStep: 'Зараз важливо зробити один маленький крок.',
    savedProgress: 'Історія збережена.',
  },
  BILLING: {
    FOCUS_PAID: {
      text: 'Оплата пройшла — вхід у ФОКУС\n\nОплата пройшла.\nВітаю, ти у ФОКУСІ.\n\nТут ми не будемо просто говорити про зміни.\nРаз на тиждень на Zoom-практиці ти будеш дивитись на свою реальну ситуацію:\n— що відкладаєш;\n— чому переносиш;\n— яке рішення не приймаєш;\n— який крок треба зробити зараз.\n\nОсь посилання на закритий канал:\n{inviteLink}\n\nПерейди і закріпи його, щоб не загубити.',
      cta: 'Перейти в канал',
    },
    PLATFORM_PAID: {
      text: 'ABSystem AI активовано. Починаємо з колеса балансу — це перший крок, щоб побачити загальну картину.',
      cta: 'Відкрити колесо балансу',
    },
    PAYMENT_FAILED: {
      text: 'Щось пішло не так з оплатою. Спробуй ще раз — або напиши нам, ми допоможемо.',
      cta: 'Спробувати ще раз',
    },
    SUB_EXPIRING: {
      text: 'Твій доступ активний ще 3 дні. Якщо хочеш продовжити рух — поновлення займе хвилину.',
      cta: 'Продовжити доступ',
    },
    SUB_EXPIRED: {
      text: 'Твій доступ завершено. Всі твої цілі, карта балансу і звіти збережені. Коли будеш готова повернутись — вони тебе чекають.',
      cta: 'Відновити доступ',
    },
    REACTIVATION: {
      text: 'З поверненням. Відновити доступ і продовжити звідти де зупинилась — один крок.',
      cta: 'Оплатити',
    },
  },
  behavioral: {
    title: 'ABSystem',
    start: {
      firstEntry: [
        'Тут ми зберемо твій рух без зайвого шуму.',
        'Почнемо з одного зрозумілого кроку.',
      ],
      afterFocus: [
        'Ти вже працювала у Focus.',
        'Тепер важливо не втратити цей рух.',
      ],
      afterInactivity: (days: number) => [
        `Я пам’ятаю твою історію після ${days} дн. паузи.`,
        'Повертаємось до того місця, де є сенс продовжити.',
      ],
      afterLongGap: [
        'Пауза була довшою, але нитка не обірвалась.',
        'Повертаємось без старту з нуля.',
      ],
      afterRepeatedAction: (action: string) => [
        `Ти вже поверталася до цього вузла: ${action}.`,
        'Підхопимо саме цю дію м’яко і без тиску.',
      ],
      afterUnresolvedGoal: (goal: string) => [
        `Минулого разу твій важливий фокус був: ${goal}.`,
        'Зараз достатньо повернутись до цієї точки.',
      ],
      afterRollback: (text: string) => [
        `Є повторюваний відкат: ${text}.`,
        'Зараз важливо не додавати нове, а повернутись до вже відомої точки.',
      ],
      afterWheelImbalance: (area: string) => [
        `Найбільше просідає зараз: ${area}.`,
        'Повертаємось до цього вузла без перевантаження.',
      ],
      afterDailyInterrupt: [
        'Щоденний цикл кілька разів переривався.',
        'Повертаю тебе до найближчої зрозумілої дії.',
      ],
      afterActive: [
        'Ти вже в робочому русі.',
        'Продовжимо з останнього незавершеного руху.',
      ],
      afterFallback: [
        'Я бачу, де рух зупинився.',
        'Повертаю тебе до найближчої корисної дії.',
      ],
    },
    narrative: {
      repeatedPostponedAction: (action: string) => [
        `Минулого разу ти кілька разів поверталась до: ${action}.`,
        'Схоже, справа не в нових ідеях, а в тому, щоб зафіксувати цю дію.',
        'Повертаємось до цього вузла і робимо один маленький крок.',
      ],
      unresolvedDecision: (decision: string) => [
        `Незавершене рішення все ще тут: ${decision}.`,
        'Схоже, зараз важливо не шукати ще одну версію відповіді, а повернутись до самої точки вибору.',
        'Зараз достатньо зафіксувати один напрям.',
      ],
      rollbackPattern: (pattern: string) => [
        `Є повторюваний відкат на тому самому вузлі: ${pattern}.`,
        'Схоже, система не просить нової інформації — вона просить стабільного рішення.',
        'Повертаємось до того місця, де рух уже починався.',
      ],
      dailyCycleInterrupted: [
        'Щоденний цикл кілька разів переривався.',
        'Схоже, зараз важливо не обговорювати процес, а просто повернутись у дію.',
        'Почнімо з найближчої простої дії.',
      ],
      wheelImbalance: (area: string) => [
        `У колесі найбільше просідає: ${area}.`,
        'Це не про нову теорію — це про повернення уваги туди, де рух почав втрачатися.',
        'Зараз достатньо одного кроку саме в цій сфері.',
      ],
      inactiveGap: (days: number) => [
        `Було ${days} дн. без помітного руху.`,
        'Схоже, пауза вже стала довшою за задуманий перепочинок.',
        'Повертаємось без тиску, але з чіткою наступною дією.',
      ],
      emotionalOverload: [
        'Тут видно перевантаження.',
        'Схоже, зараз не час для нового списку — потрібна одна ясна дія.',
        'Почни з найпростішого кроку, який можна зробити без напруги.',
      ],
      unstableState: [
        'Рух став нестійким.',
        'Тут повторюється коливання між рішенням і відкладенням.',
        'Повернись до однієї дії й зафіксуй її.',
      ],
      genericFallback: [
        'Я бачу, де рух зупинився.',
        'Не треба починати спочатку — достатньо повернутись до найближчої дії.',
      ],
    },
    cta: {
      continue: '↩️ Продовжити',
      focus: '🎯 Повернутись у Focus',
      mentor: '💬 Продовжити розмову',
      platform: '🚀 Перейти далі',
      restore: '♻️ Повернутись до останньої точки',
    },
  },
  winback: {
    title: 'Повертаємо твій рух',
    body: 'Є збережена історія, з якої можна продовжити.',
  },
  WINBACK: {
    WINBACK_3D: {
      title: 'Повертаємо твій рух',
      text: 'Твій доступ до ABSystem AI завершився. За цей час ти вже зібрала точку А, ціль, перші рішення. Щоб не втратити цей рух — продовж доступ.',
      cta: 'Продовжити доступ',
    },
    WINBACK_7D: (dailyCycles: number, decisions: number) => ({
      title: 'Повертаємо твій рух',
      text: `Ти пройшла ${dailyCycles} щоденних циклів і зафіксувала ${decisions} рішень. Цей контекст збережений. Коли будеш готова — один крок і ти всередині.`,
      cta: 'Відновити',
    }),
    WINBACK_14D: {
      title: 'Повертаємо твій рух',
      text: 'Остаточне нагадування. Твої дані збережені. Коли час прийде — ми тут.',
      cta: 'Відновити доступ',
    },
  },
  REFERRAL: {
    title: 'Поділись тестом',
    text: 'Ти вже досить довго в ABSystem і бачиш свій рух. Якщо є хтось, кому це теж підійде — поділись тестом. Вони пройдуть безкоштовно і побачать свою точку зупинки.',
    cta: 'Поділитись тестом',
  },
  emotionalRecovery: {
    title: 'Почнемо м’якше',
    body: 'Не треба робити все одразу. Достатньо одного зрозумілого кроку.',
  },
  errors: {
    questionMissing: {
      title: 'Не знайшов поточний крок',
      body: 'Повертаю до останнього збереженого місця.',
    },
    aiUnavailable: {
      title: 'Відповідь не дійшла',
      body: 'Спробуй ще раз коротко: що зараз найважливіше?',
    },
    voiceFailure: {
      title: 'Голос не розпізнався',
      body: 'Можеш написати текстом — я підхоплю далі.',
    },
    paymentInterrupted: {
      title: 'Оплата не завершилась',
      body: 'Повертаю до того ж кроку без втрати історіяу.',
    },
    sessionExpired: {
      title: 'Пауза завершилась',
      body: 'Історія збережена. Повертаємось до наступного кроку.',
    },
    flowInterrupted: {
      title: 'Рух перервався',
      body: 'Повертаю до найближчого збереженого кроку.',
    },
    duplicateAction: {
      title: 'Крок уже оброблено',
      body: 'Відкриваю актуальний стан замість дубля.',
    },
    retry: {
      title: 'Поки не вийшло',
      body: 'Спробуй ще раз за кілька секунд.',
    },
  },
  status: {
    title: 'Ти вже всередині практикуму.',
    intro: 'Ось де рух зупинився і що зараз важливо.',
    currentStep: 'Остання точка',
    nextStep: 'Наступна дія',
    continue: 'Продовжити',
    resumeFromLatest: 'Можеш продовжити з останньої точки.',
    contextSaved: 'Ми зберегли твій історія.',
    returning: 'Ти вже поверталася до цього запиту раніше.',
    focus: 'Зараз важливо не втратити напрям.',
  },
  menu: {
    title: 'Що далі',
    body: [
      'Одна дія веде до результату, Focus, Zoom і наступного кроку.',
      'Якщо перервався, історію можна відновити без втрати відповідей.',
    ],
  },
  presentation: {
    lifecycleLabels: {
      anonymous: 'ще не прив’язано',
      lead: 'перший вхід',
      activated: 'перший крок уже зроблено',
      trial_active: 'пробний доступ',
      paid_active: 'активний доступ',
      paused: 'доступ на паузі',
      expired: 'доступ завершився',
      churned: 'пауза затягнулась',
      guest: 'перший вхід',
      onboarding: 'перші кроки',
      trial: 'пробний доступ',
      active: 'активний доступ',
      gifted: 'подарунковий доступ',
      bonus: 'бонусний доступ',
      completed: 'шлях уже пройдений',
      winback: 'повернення до руху',
      inactive: 'ще не активовано',
      low_activity: 'активність знизилась',
      high_engagement: 'залученість висока',
      upsell_ready: 'готовий до наступного кроку',
      mentor_candidate: 'готовий до глибшої розмови',
      onboarding_started: 'перші кроки вже йдуть',
      focus: 'Focus',
      absystem: 'ABSystem',
    },
    subscriptionLabels: {
      inactive: 'ще не активовано',
      trial: 'пробний доступ',
      active: 'активний доступ',
      paused: 'доступ на паузі',
      expired: 'доступ завершився',
      cancelled: 'доступ скасовано',
    },
    roomLabels: {
      active: 'ти вже всередині',
      trial: 'пробний доступ',
      paused: 'пауза збережена',
      'onboarding-started': 'перші кроки вже йдуть',
      inactive: 'ще не активовано',
    },
    flowLabels: {
      lead_magnet: 'практикум',
      onboarding: 'перші кроки',
      mentor: 'розмова',
      reengagement: 'повернення до руху',
      day: 'щоденна дія',
      morning: 'ранковий крок',
      evening: 'вечірня дія',
      daily: 'щоденна дія',
      start: 'вхід',
      resume: 'повернення',
      paywall: 'крок оплати',
      subscription: 'доступ',
      ai_mentor: 'розмова',
    },
    stepLabels: {
      LINK_TELEGRAM: 'прив’язка Telegram',
      START_FLOW: 'початок',
      TRIAL_OFFER: 'пробний доступ',
      ENTRY: 'вхід',
      ACTIVE: 'активний режим',
      INACTIVE: 'пауза',
      ONBOARDING: 'перші кроки',
      PAYWALL: 'крок оплати',
      RESUME: 'повернення',
      WINBACK: 'повернення до руху',
      STABILITY: 'стабільний стан',
      CONFLICT: 'внутрішній вузол',
      CONVERSION: 'підтвердження вибору',
      ACTION: 'дія',
      RETENTION: 'утримання',
    },
    trustLabels: {
      cold: 'ми ще збираємо історію',
      engaged: 'ти вже поверталась до цього',
      consistent: 'у тебе вже з’явився рух',
      open: 'з тобою вже простіше рухатись далі',
      'deep-work-ready': 'можна йти глибше',
      'mentor-ready': 'можна переходити до глибшої розмови',
      'high-trust': 'історія вже добре тримається',
    } satisfies Record<RelationshipTrustProgression, string>,
  },
} as const

import {
  AB_TEST_FOCUS_JOIN_CTA_TEXT,
  AB_TEST_FOCUS_PAYMENT_CTA_1M,
  AB_TEST_FOCUS_PAYMENT_CTA_3M,
} from '../../ab-system/content/abTest.shared.js'

export const absystemButtons = {
  startTest: 'Почати тест',
  continueTest: 'Продовжити тест',
  restoreProgress: 'Продовжити',
  continueInChat: '💬 Продовжити в чаті',
  openMiniApp: '📱 Відкрити Mini App',
  openInBrowser: '🌐 Відкрити в браузері',
  whatToDo: 'Що з цим робити?',
  joinFocus: 'Хочу у ФОКУС',
  payFocus: 'Оплатити ФОКУС',
  joinFocusNow: AB_TEST_FOCUS_JOIN_CTA_TEXT.replace(/ →$/, ''),
  joinChannel: 'Перейти в канал',
  focusMonthly: AB_TEST_FOCUS_PAYMENT_CTA_1M,
  focusQuarterly: AB_TEST_FOCUS_PAYMENT_CTA_3M,
  openPlatform: 'Перейти в ABSystem AI',
  openDashboard: 'Відкрити платформу',
  openDailyCycle: 'Відкрити щоденник',
  openZoom: 'Відкрити Zoom',
  back: 'Назад',
  continue: 'Продовжити',
  edit: (n: number) => `✏️ Змінити №${n}`,
  renewAccess: 'Продовжити доступ',
  restoreAccess: 'Відновити доступ',
  tryAgain: 'Спробувати ще раз',
  joinWaitlist: 'Залишити заявку',
  shareTest: 'Поділитись тестом',
} as const

export type AbsystemButtonKey = keyof typeof absystemButtons

export type AbsSystemBillingKey = keyof typeof absystemContent.BILLING

export function getBillingMessage(key: AbsSystemBillingKey) {
  return absystemContent.BILLING[key]
}

export function buildAbsystemStatusSnapshot(input: {
  relationship?: RelationshipMemoryProfile | null
  currentStep?: string | null
  currentLesson?: string | null
  nextStep?: string | null
  retainedContext?: boolean
  productLabel?: string | null
}): string[] {
  const narrative = buildBehavioralNarrative({
    currentFocus: input.currentLesson ?? input.currentStep ?? undefined,
    unresolvedGoal: input.relationship?.lastMeaningfulGoal ?? undefined,
    repeatedPostponedAction: input.relationship?.repeatedPostponedAction ?? undefined,
    repeatedRollback: Boolean(input.relationship?.repeatedRollbackTrigger),
    inactivityDays: input.relationship?.returnGapDays ?? undefined,
    wheelImbalance: input.relationship?.productContinuity?.focus
      ? { weakestArea: 'Focus', score: 0 }
      : undefined,
    lastMeaningfulAction: input.relationship?.lastMeaningfulProgress ?? undefined,
    unfinishedStrategyNode: input.nextStep ?? undefined,
    lastZoomTopic: input.relationship?.lastZoomTopic ?? undefined,
    dailyCycleInterrupted: Boolean(input.relationship?.abandonmentPattern),
    emotionalPattern: input.relationship?.lastEmotionalState ?? undefined,
    momentumLevel: input.relationship?.behavioralStabilizationTrend === 'stable'
      ? 'high'
      : input.relationship?.behavioralStabilizationTrend === 'improving'
        ? 'medium'
        : 'low',
    focusParticipation: Boolean(input.relationship?.lastFocusInsight || input.relationship?.lastZoomTopic),
    focusSessionsCount: input.relationship?.productContinuity?.focus ? 1 : 0,
    lastWeeklyReportInsight: undefined,
    unresolvedDecision: input.relationship?.unfinishedDecision ?? undefined,
    repeatedAvoidancePattern: input.relationship?.recurringTomorrowBehavior ?? undefined,
  }, 'status')

  return [
    narrative.title,
    ...narrative.body,
    input.retainedContext ? absystemContent.status.contextSaved : '',
  ].filter((line) => String(line ?? '').trim().length > 0)
}

export function buildAbsystemRecoveryCopy(
  kind:
    | 'stale_callback'
    | 'flow_interrupted'
    | 'session_expired'
    | 'question_missing'
    | 'ai_unavailable'
    | 'voice_failure'
    | 'payment_interrupted'
    | 'zoom_missed'
    | 'progress_stalled'
    | 'duplicate_action',
  relationship?: RelationshipMemoryProfile | null,
  details: { step?: string | null; context?: string | null; nextStep?: string | null } = {},
) {
  switch (kind) {
    case 'stale_callback':
      return {
        title: '',
        body: '',
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'flow_interrupted':
      return {
        title: 'Рух перервався',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          relationship?.repeatedPostponedAction ? absystemContent.behavioral.narrative.repeatedPostponedAction(relationship.repeatedPostponedAction)[0] : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.restore,
      }
    case 'session_expired':
      return {
        title: 'Контекст збережено',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          relationship?.inactivityContext ?? null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'question_missing':
      return {
        title: 'Повертаю тебе до історіяу',
        body: [
          absystemContent.behavioral.narrative.genericFallback[0],
          details.context ? `Контекст: ${details.context}.` : null,
          relationship?.repeatedPostponedAction ? absystemContent.behavioral.narrative.repeatedPostponedAction(relationship.repeatedPostponedAction)[0] : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.restore,
      }
    case 'ai_unavailable':
      return {
        title: absystemContent.errors.aiUnavailable.title,
        body: absystemContent.errors.aiUnavailable.body,
        cta: absystemContent.buttons.retry,
      }
    case 'voice_failure':
      return {
        title: absystemContent.errors.voiceFailure.title,
        body: absystemContent.errors.voiceFailure.body,
        cta: absystemContent.buttons.retry,
      }
    case 'payment_interrupted':
      return {
        title: 'Оплата не завершилась',
        body: 'Повертаю тебе до оплати без втрати історіяу.',
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'zoom_missed':
      return {
        title: 'Zoom пропущено',
        body: absystemContent.zoom.missed,
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'progress_stalled':
      return {
        title: 'Рух зупинився',
        body: [
          'Схоже, зараз важливо не додавати нове, а повернутись до вже знайомого вузла.',
          relationship?.repeatedRollbackTrigger ? `Повторюється той самий вузол: ${relationship.repeatedRollbackTrigger}.` : null,
        ].filter(Boolean).join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
    case 'duplicate_action':
    default:
      return {
        title: 'Крок уже оброблено',
        body: absystemContent.behavioral.narrative.genericFallback.join(' '),
        cta: absystemContent.behavioral.cta.continue,
      }
  }
}

export function buildAbsystemStartCopy(input: {
  relationship?: RelationshipMemoryProfile | null
  hasFocusParticipation?: boolean
  hasActiveProduct?: boolean
  returnGapDays?: number | null
}): {
  title: string
  body: ReadonlyArray<string>
  cta: { text: string; callback_data: string }
} {
  const relationship = input.relationship
  const hasRelationship = Boolean(relationship?.available)

  if (!hasRelationship) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.firstEntry,
      cta: { text: absystemContent.start.cta.start, callback_data: 'start_trial' },
    }
  }

  if (input.hasActiveProduct && relationship?.lastMeaningfulGoal) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterUnresolvedGoal(relationship.lastMeaningfulGoal),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (input.hasFocusParticipation || relationship?.lastFocusInsight || relationship?.lastZoomTopic) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterFocus,
      cta: { text: absystemContent.start.cta.focus, callback_data: 'open_focus_portal' },
    }
  }

  if (typeof input.returnGapDays === 'number' && input.returnGapDays >= 30) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterLongGap,
      cta: { text: absystemContent.start.cta.continue, callback_data: 'return_main_menu' },
    }
  }

  if (typeof input.returnGapDays === 'number' && input.returnGapDays > 0) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterInactivity(input.returnGapDays),
      cta: { text: absystemContent.start.cta.continue, callback_data: 'return_main_menu' },
    }
  }

  if (relationship?.repeatedPostponedAction) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterRepeatedAction(relationship.repeatedPostponedAction),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (relationship?.lastMeaningfulGoal) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterUnresolvedGoal(relationship.lastMeaningfulGoal),
      cta: { text: absystemContent.start.cta.mentor, callback_data: 'continue_ai_mentor' },
    }
  }

  if (relationship?.lastMeaningfulProgress && !input.hasActiveProduct) {
    return {
      title: absystemContent.start.title,
      body: absystemContent.start.afterTest,
      cta: { text: absystemContent.start.cta.continue, callback_data: 'continue_ai_mentor' },
    }
  }

  return {
    title: absystemContent.start.title,
    body: absystemContent.start.afterActive,
    cta: { text: absystemContent.start.cta.platform, callback_data: 'open_platform' },
  }
}
