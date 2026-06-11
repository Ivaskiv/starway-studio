export type AbTestAnswerId = 'state' | 'goal' | 'choice' | 'decision' | 'action'

export type AbTestQuestion = {
  id: string
  prompt: string
  behavioralType: string
  answers: Array<{
    id: AbTestAnswerId
    text: string
  }>
  nextQuestionId?: string | null
}

export type AbTestQuestionsResponse = {
  questions: AbTestQuestion[]
  total: number
}

export const AB_TEST_FALLBACK_QUESTIONS: AbTestQuestion[] = [
  {
    id: 'q1',
    prompt: 'Коли ти думаєш про те чого хочеш в житті — що відчуваєш першим?',
    behavioralType: 'energy',
    answers: [
      {
        id: 'state',
        text: 'А.\nВтому. Навіть думати про це вже немає сил.',
      },
      {
        id: 'goal',
        text: 'Б.\nРозгубленість. Не знаю чого насправді хочу.',
      },
      {
        id: 'choice',
        text: 'В.\nТривогу. А раптом оберу не те?',
      },
      {
        id: 'decision',
        text: 'Г.\nСумнів. Ніби знаю — але щось зупиняє.',
      },
      {
        id: 'action',
        text: 'Д.\nБажання зробити. Але знову відкладаю.',
      },
    ],
    nextQuestionId: 'q2',
  },
  {
    id: 'q2',
    prompt: 'Що найчастіше заважає тобі щось змінити?',
    behavioralType: 'discipline',
    answers: [
      {
        id: 'state',
        text: 'А.\nНемає сил. Тримаюся з останніх — і ще щось починати?',
      },
      {
        id: 'goal',
        text: 'Б.\nНе знаю куди іти. Хочу змін але не знаю яких.',
      },
      {
        id: 'choice',
        text: 'В.\nСтрашно зробити неправильно. Краще не починати.',
      },
      {
        id: 'decision',
        text: 'Г.\nНе можу сказати собі остаточно: "Все, я це роблю."',
      },
      {
        id: 'action',
        text: 'Д.\nПочинаю — і знову зупиняюсь. По колу.',
      },
    ],
    nextQuestionId: 'q3',
  },
  {
    id: 'q3',
    prompt: 'Як виглядає твій день коли знову нічого не вийшло?',
    behavioralType: 'discipline',
    answers: [
      {
        id: 'state',
        text: 'А.\nЗлюся на себе. Або просто лягаю — більше нічого не хочеться.',
      },
      {
        id: 'goal',
        text: 'Б.\nРоблю щось — але відчуття що йду не туди.',
      },
      {
        id: 'choice',
        text: 'В.\nЗнову думаю, знову порівнюю. І знову нічого не обираю.',
      },
      {
        id: 'decision',
        text: 'Г.\nЗнову перенесла. І знову не розумію чому.',
      },
      {
        id: 'action',
        text: 'Д.\nБула зайнята весь день — але результату нема.',
      },
    ],
    nextQuestionId: 'q4',
  },
  {
    id: 'q4',
    prompt: 'Якщо чесно — де ти зупиняєшся найчастіше?',
    behavioralType: 'decision',
    answers: [
      {
        id: 'state',
        text: 'А.\nНа самому початку — взагалі немає сил навіть почати.',
      },
      {
        id: 'goal',
        text: 'Б.\nКоли треба зрозуміти чого хочу — бо не знаю і починаю сумніватись.',
      },
      {
        id: 'choice',
        text: 'В.\nНа виборі — кружляю в одних і тих самих варіантах роками.',
      },
      {
        id: 'decision',
        text: 'Г.\nМіж "вирішила" і "зробила" — вирішила, але нічого не відбувається.',
      },
      {
        id: 'action',
        text: 'Д.\nВ середині — починаю але не завершую. І знову беруся за щось нове.',
      },
    ],
    nextQuestionId: 'q5',
  },
  {
    id: 'q5',
    prompt: 'Що ти кажеш собі коли знову зупиняєшся?',
    behavioralType: 'choice',
    answers: [
      {
        id: 'state',
        text: 'А.\n«Немає сил. Потім. Коли відпочину — тоді почну.»',
      },
      {
        id: 'goal',
        text: 'Б.\n«Я не знаю чого насправді хочу. Може це взагалі не моє.»',
      },
      {
        id: 'choice',
        text: 'В.\n«Що якщо я оберу неправильно? Треба ще подумати.»',
      },
      {
        id: 'decision',
        text: 'Г.\n«Я все розумію. Але чомусь не роблю. Що зі мною не так?»',
      },
      {
        id: 'action',
        text: 'Д.\n«Я стараюсь але нічого не виходить. Мабуть я роблю щось не так.»',
      },
    ],
    nextQuestionId: 'q6',
  },
  {
    id: 'q6',
    prompt: 'Чого тобі зараз найбільше бракує?',
    behavioralType: 'decision',
    answers: [
      {
        id: 'state',
        text: 'А.\nСил і спокою — щоб просто нормально функціонувати.',
      },
      {
        id: 'goal',
        text: 'Б.\nРозуміння чого я насправді хочу.',
      },
      {
        id: 'choice',
        text: 'В.\nСміливості нарешті обрати і не озиратись.',
      },
      {
        id: 'decision',
        text: 'Г.\nТого моменту коли скажу собі: "Все. Я це роблю." І не відступлю.',
      },
      {
        id: 'action',
        text: 'Д.\nОдного конкретного кроку з якого все нарешті почнеться.',
      },
    ],
    nextQuestionId: 'q7',
  },
  {
    id: 'q7',
    prompt: 'Коли ти відкладаєш важливе, що за цим найчастіше стоїть?',
    behavioralType: 'choice',
    answers: [
      {
        id: 'state',
        text: 'А.\nЯ просто виснажена. Немає звідки брати сили.',
      },
      {
        id: 'goal',
        text: 'Б.\nЯ не впевнена що це моє. Може хочу зовсім іншого.',
      },
      {
        id: 'choice',
        text: 'В.\nБоюсь втратити інші варіанти якщо оберу цей.',
      },
      {
        id: 'decision',
        text: 'Г.\nЯ ще не прийняла рішення до кінця. Щось тримає.',
      },
      {
        id: 'action',
        text: 'Д.\nНе зробила це простим і конкретним. Тому і не роблю.',
      },
    ],
    nextQuestionId: 'q8',
  },
  {
    id: 'q8',
    prompt: 'Що тобі зараз допомогло б найбільше?',
    behavioralType: 'action',
    answers: [
      {
        id: 'state',
        text: 'А.\nПовернути себе в нормальний стан — щоб були сили діяти.',
      },
      {
        id: 'goal',
        text: 'Б.\nНарешті зрозуміти чого я хочу. По-справжньому.',
      },
      {
        id: 'choice',
        text: 'В.\nОбрати один напрямок і перестати кружляти.',
      },
      {
        id: 'decision',
        text: 'Г.\nПрийняти рішення — і не торгуватись із собою більше.',
      },
      {
        id: 'action',
        text: 'Д.\nЗробити перший конкретний крок. Один. Але справжній.',
      },
    ],
    nextQuestionId: null,
  },
] as const

export const AB_TEST_FALLBACK_QUESTIONS_RESPONSE: AbTestQuestionsResponse = {
  questions: AB_TEST_FALLBACK_QUESTIONS,
  total: AB_TEST_FALLBACK_QUESTIONS.length,
}
