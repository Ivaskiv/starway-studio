export type MentorMethodologyStage = 'STATE' | 'GOAL' | 'CHOICE' | 'DECISION' | 'ACTION'

export type MentorTechnique =
  | 'validation'
  | 'clarifying_question'
  | 'reframe'
  | 'scaling'
  | 'values_anchor'
  | 'cost_of_inaction'
  | 'boundary_check'
  | 'commitment_lock'
  | 'micro_action'
  | 'accountability_check'

export type MentorCategory =
  | 'goal_setting'
  | 'procrastination'
  | 'fear'
  | 'burnout'
  | 'relationships'
  | 'career'
  | 'money'
  | 'self_esteem'
  | 'planning'
  | 'daily_accountability'

export type MentorTransportExpectation = {
  primaryIntent: string
  selectedAgent: string
  recommendedAction: string
  userState: string
}

export type MentorGoldenConversation = Readonly<{
  id: string
  category: MentorCategory
  userInput: string
  expectedCoachingObjective: string
  expectedMethodologyStage: MentorMethodologyStage
  expectedTechnique: MentorTechnique
  expectedNextQuestion: string
  expectedTransport: MentorTransportExpectation
  context: Readonly<{
    lifecycleState: 'onboarding' | 'trial' | 'paid' | 'expired'
    subscriptionStatus: 'inactive' | 'active' | 'expired'
    subscriptionDaysLeft: number | null
    focusActive: boolean
    primaryGoal: string | null
    unfinishedActionTitle: string | null
    lastAssistantMessage: string | null
    allowPaidOffer: boolean
    allowPlatformRecommendation: boolean
    zoomScheduled: boolean
    historyTag: string | null
  }>
}>

type ScenarioBlueprint = Readonly<{
  stage: MentorMethodologyStage
  technique: MentorTechnique
  objective: string
  nextQuestion: string
  transport: MentorTransportExpectation
  context: MentorGoldenConversation['context']
}>

type CategoryDefinition = Readonly<{
  category: MentorCategory
  prompts: readonly string[]
  blueprints: readonly ScenarioBlueprint[]
}>

const GOAL_BLUEPRINTS: readonly ScenarioBlueprint[] = [
  {
    stage: 'STATE',
    technique: 'validation',
    objective: 'help the user name the current internal friction before choosing a direction',
    nextQuestion: 'Що зараз тисне найбільше: розмитість цілі чи страх почати?',
    transport: { primaryIntent: 'general_support', selectedAgent: 'mentor', recommendedAction: 'none', userState: 'planning' },
    context: {
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 14,
      focusActive: true,
      primaryGoal: 'Сформувати одну головну ціль на квартал',
      unfinishedActionTitle: 'Виписати 3 результати кварталу',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: true,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'GOAL',
    technique: 'clarifying_question',
    objective: 'turn a vague wish into a measurable result',
    nextQuestion: 'Який конкретний результат покаже тобі, що ця ціль вже реально працює?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'mentor', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 12,
      focusActive: true,
      primaryGoal: 'Зібрати одну чітку ціль на квартал',
      unfinishedActionTitle: 'Сформулювати вимірюваний результат',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: true,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'CHOICE',
    technique: 'values_anchor',
    objective: 'help the user choose between competing priorities',
    nextQuestion: 'Якщо лишити тільки один пріоритет, який із них справді служить твоєму головному вектору?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'assistant', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionDaysLeft: null,
      focusActive: false,
      primaryGoal: 'Вибрати один пріоритет замість трьох паралельних',
      unfinishedActionTitle: 'Звузити список цілей',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'DECISION',
    technique: 'commitment_lock',
    objective: 'move from analysis into a clean commitment',
    nextQuestion: 'Яке рішення ти готовий(а) зафіксувати одним реченням без запасного виходу?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'assistant', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'onboarding',
      subscriptionStatus: 'inactive',
      subscriptionDaysLeft: null,
      focusActive: false,
      primaryGoal: 'Перестати змінювати ціль щотижня',
      unfinishedActionTitle: 'Зафіксувати одну ціль на 30 днів',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'ACTION',
    technique: 'micro_action',
    objective: 'reduce the goal to one immediate step with time and result',
    nextQuestion: 'Яку одну мікродію ти зробиш сьогодні і коли саме?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'assistant', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'trial',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 5,
      focusActive: false,
      primaryGoal: 'Перекласти ціль у перший видимий крок',
      unfinishedActionTitle: 'Призначити перший слот у календарі',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'STATE',
    technique: 'scaling',
    objective: 'assess how much inner energy is available for the chosen goal',
    nextQuestion: 'По шкалі від 1 до 10 наскільки ця ціль зараз жива для тебе?',
    transport: { primaryIntent: 'general_support', selectedAgent: 'assistant', recommendedAction: 'none', userState: 'planning' },
    context: {
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 9,
      focusActive: false,
      primaryGoal: 'Перевірити, чи ціль ще справді моя',
      unfinishedActionTitle: 'Оцінити рівень енергії до цілі',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'GOAL',
    technique: 'reframe',
    objective: 'replace a performative goal with a grounded real outcome',
    nextQuestion: 'Як виглядає не красива, а реально корисна для тебе версія цієї цілі?',
    transport: { primaryIntent: 'general_support', selectedAgent: 'assistant', recommendedAction: 'none', userState: 'planning' },
    context: {
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 10,
      focusActive: false,
      primaryGoal: 'Відсікти нав’язані цілі',
      unfinishedActionTitle: 'Переформулювати ціль під себе',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'CHOICE',
    technique: 'cost_of_inaction',
    objective: 'make the cost of postponing the choice visible',
    nextQuestion: 'Що ти втрачаєш, якщо ще тиждень не обереш один головний напрям?',
    transport: { primaryIntent: 'general_support', selectedAgent: 'assistant', recommendedAction: 'none', userState: 'planning' },
    context: {
      lifecycleState: 'expired',
      subscriptionStatus: 'expired',
      subscriptionDaysLeft: null,
      focusActive: false,
      primaryGoal: 'Повернути собі ясний напрям',
      unfinishedActionTitle: null,
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'DECISION',
    technique: 'boundary_check',
    objective: 'help the user decide what not to pursue right now',
    nextQuestion: 'Від чого ти свідомо відмовишся на цей місяць, щоб не розпорошитись?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'assistant', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 8,
      focusActive: false,
      primaryGoal: 'Звільнити місце для одного сильного фокусу',
      unfinishedActionTitle: 'Прибрати 2 зайві паралельні цілі',
      lastAssistantMessage: null,
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: null,
    },
  },
  {
    stage: 'ACTION',
    technique: 'accountability_check',
    objective: 'finish the goal-setting turn with a visible accountability checkpoint',
    nextQuestion: 'Коли ти повернешся з фактом, що цей крок уже зроблено?',
    transport: { primaryIntent: 'next_step_guidance', selectedAgent: 'assistant', recommendedAction: 'resume_goal', userState: 'planning' },
    context: {
      lifecycleState: 'trial',
      subscriptionStatus: 'active',
      subscriptionDaysLeft: 3,
      focusActive: false,
      primaryGoal: 'Закрити перший крок і не зливати імпульс',
      unfinishedActionTitle: 'Відправити собі звіт після виконання',
      lastAssistantMessage: 'Ти вже обрав(ла) одну ціль на місяць.',
      allowPaidOffer: false,
      allowPlatformRecommendation: false,
      zoomScheduled: false,
      historyTag: 'commitment',
    },
  },
] as const

const CATEGORY_PROMPTS: Record<MentorCategory, readonly string[]> = {
  goal_setting: [
    'Я хочу нарешті поставити собі нормальну ціль, а не абстрактне "змінити життя".',
    'У мене багато бажань, але я не можу зрозуміти, яка ціль зараз головна.',
    'Я знову беру три великі напрямки одночасно і гублюсь.',
    'Мені складно вибрати одну ціль, бо все здається важливим.',
    'Я хочу не просто мріяти, а мати чітку ціль на цей місяць.',
    'Я не впевнений(а), що моя поточна ціль ще справді моя.',
    'Схоже, я женуся за красивою ціллю, а не за реальною.',
    'Я відкладаю вибір напряму, бо боюсь помилитися.',
    'Я хочу обрізати зайве і лишити один фокус.',
    'Я вже обрав(ла) ціль, але треба закріпити це дією.',
  ],
  procrastination: [
    'Я відкладаю найважливішу задачу вже третій день.',
    'Я ніби знаю що робити, але постійно уникаю старту.',
    'Я знову замінюю головну задачу дрібницями.',
    'Я не можу сісти за задачу, хоча дедлайн вже близько.',
    'Коли доходить до дії, я зависаю і йду в телефон.',
    'Я відкладаю, бо боюсь що не витягну результат.',
    'Я придумую собі підготовку замість реального старту.',
    'Я весь день зайнятий(а), але не рухаю головне.',
    'Я вже знаю свій патерн відкладання, але все одно в нього падаю.',
    'Я хочу зупинити це відкладання сьогодні, а не з понеділка.',
  ],
  fear: [
    'Мені страшно показати людям свій новий продукт.',
    'Я боюсь зробити крок, бо раптом облажаюсь.',
    'Я весь час відкладаю рішення через страх помилки.',
    'Мені страшно просити за свою роботу більше грошей.',
    'Я відчуваю страх перед запуском і зависаю.',
    'Мені страшно, що якщо я реально спробую, то провалюсь.',
    'Я боюсь конфлікту, тому мовчу замість діяти.',
    'Я боюсь, що люди подумають про мене щось не те.',
    'Через страх я тримаюсь за старий сценарій, хоча він душить.',
    'Я хочу пройти через цей страх, але не знаю як почати.',
  ],
  burnout: [
    'Я відчуваю вигорання і вже не хочу нічого тиснути.',
    'Я втомився(лась) настільки, що навіть прості задачі дратують.',
    'У мене ніби немає сил ні на роботу, ні на себе.',
    'Я вже не відчуваю сенсу в тому темпі, в якому живу.',
    'Я прокидаюсь виснаженим(ою) і весь день тягну все на силі волі.',
    'Мені здається, що я згорів(ла) і не можу відновитися.',
    'Я хочу не просто відпочити, а зрозуміти, що зі мною відбувається.',
    'Я постійно злюсь, коли думаю про роботу.',
    'Я дотягую справи, але ціною повного внутрішнього нуля.',
    'Я хочу повернути собі ресурс без чергового самонасильства.',
  ],
  relationships: [
    'Я не можу нормально сказати партнеру, що мене зачіпає.',
    'Я знову мовчу в стосунках, а потім вибухаю.',
    'Я не розумію, де в цій ситуації мої межі.',
    'Я постійно підлаштовуюсь під інших і злюсь на себе.',
    'Мені важко вибрати між збереженням стосунків і чесністю.',
    'Я боюсь втратити людину, якщо скажу правду.',
    'У стосунках я ніби зникаю і не знаю, чого хочу сам(а).',
    'Я хочу перестати тягнути все на собі в цих стосунках.',
    'Я не можу прийняти рішення: говорити прямо чи знову змовчати.',
    'Я хочу зробити один зрілий крок у цій розмові, а не драму.',
  ],
  career: [
    'Я відчуваю, що застряг(ла) в кар’єрі і не росту.',
    'Я не розумію, чи лишатись у цій роботі, чи рухатись далі.',
    'Мені важко вибрати наступний кар’єрний крок.',
    'Я хочу змін, але боюсь втратити стабільність.',
    'Я працюю багато, але не бачу відчутного сенсу.',
    'Я сумніваюсь, чи моя кар’єрна ціль взагалі моя.',
    'Я ніби завис(ла) між безпечним і живим варіантом.',
    'Я не можу зібратись і почати рух у новий бік.',
    'Я хочу прийняти чесне рішення щодо роботи, а не тягнути.',
    'Мені потрібен один реальний кар’єрний крок на цей тиждень.',
  ],
  money: [
    'Я постійно напружуюсь, коли думаю про гроші.',
    'Мені соромно піднімати ціну, хоча я вже виріс(ла).',
    'Я відкладаю фінансові рішення, бо не хочу дивитися в цифри.',
    'Я боюсь, що якщо попрошу більше, мене не виберуть.',
    'Я не контролюю гроші й через це в мені багато тривоги.',
    'Я працюю, але відчуваю, що гроші розтікаються повз мене.',
    'Я не можу вирішити: економити чи вкладати у розвиток.',
    'Я хочу перестати уникати розмов про гроші.',
    'Мені треба прийняти фінансове рішення, але я його обтікаю.',
    'Я хочу один конкретний крок, щоб повернути відчуття опори в грошах.',
  ],
  self_esteem: [
    'Мені складно повірити, що я взагалі можу це витягнути.',
    'Я постійно знецінюю те, що вже зробив(ла).',
    'Мені здається, що інші кращі й мені нема чого показувати.',
    'Я боюсь заявити про себе, бо ніби ще недостатній(я).',
    'Я не можу спертися на себе, коли треба зробити сміливий крок.',
    'Я постійно ставлю під сумнів власну цінність.',
    'Я хочу не ховатись, але всередині багато сорому.',
    'Я ніби чекаю дозволу бути видимим(ою).',
    'Я хочу прийняти рішення не з меншовартості, а з поваги до себе.',
    'Мені потрібна одна дія, щоб повернути собі опору в собі.',
  ],
  planning: [
    'У мене хаос у задачах і я не розумію, з чого почати.',
    'Я планую занадто багато і потім не роблю нічого.',
    'Я хочу нормальний план на тиждень без самообману.',
    'Мені складно вибрати, яка задача реально головна сьогодні.',
    'Я кидаюсь між задачами і не доводжу до кінця.',
    'Я бачу цілі, але не бачу маршруту до них.',
    'Я не можу пріоритезувати, бо все термінове.',
    'Я хочу відсікти зайве і зібрати собі живий план.',
    'Мені потрібно прийняти рішення, що не робити цього тижня.',
    'Я хочу одну мікродію, яка поверне мені контроль над планом.',
  ],
  daily_accountability: [
    'Я знову злив день і не хочу брехати собі, що все ок.',
    'Я починаю день сильно, але ввечері бачу, що головне не зробив(ла).',
    'Мені важко тримати щоденну дисципліну без зовнішньої опори.',
    'Я хочу чесно дивитись на факт дня, а не вигадувати виправдання.',
    'Я знову не дотримався(лась) того, що собі пообіцяв(ла).',
    'Я бачу, що збиваюсь із ритму на третій день поспіль.',
    'Я хочу зрозуміти, де саме втрачаю день.',
    'Мені треба вибрати: продовжувати хаос чи повернути собі ритм.',
    'Я хочу зафіксувати нове рішення щодо щоденної дисципліни.',
    'Мені потрібен конкретний щоденний чекпойнт, щоб не зливатися.',
  ],
}

const BLUEPRINTS_BY_CATEGORY: Record<MentorCategory, readonly ScenarioBlueprint[]> = {
  goal_setting: GOAL_BLUEPRINTS,
  planning: GOAL_BLUEPRINTS,
  daily_accountability: GOAL_BLUEPRINTS,
  procrastination: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: index < 2
      ? { primaryIntent: 'emotional_support', selectedAgent: 'coach', recommendedAction: 'recommend_mentor', userState: 'blocked' }
      : { primaryIntent: 'emotional_support', selectedAgent: index < 5 ? 'coach' : 'assistant', recommendedAction: index < 5 ? 'recommend_mentor' : 'ask_clarification', userState: 'blocked' },
    context: {
      ...item.context,
      lifecycleState: index < 5 ? 'paid' : 'onboarding',
      subscriptionStatus: index < 5 ? 'active' : 'inactive',
      focusActive: false,
      primaryGoal: 'Перестати відкладати головну задачу',
      unfinishedActionTitle: 'Сісти в перший 10-хв слот',
      allowPlatformRecommendation: false,
    },
  })),
  fear: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: { primaryIntent: 'emotional_support', selectedAgent: 'coach', recommendedAction: index < 6 ? 'recommend_mentor' : 'ask_clarification', userState: 'blocked' },
    context: {
      ...item.context,
      lifecycleState: index < 6 ? 'paid' : 'onboarding',
      subscriptionStatus: index < 6 ? 'active' : 'inactive',
      focusActive: false,
      primaryGoal: 'Пройти через страх без уникання',
      unfinishedActionTitle: 'Назвати один сміливий крок',
      allowPlatformRecommendation: false,
    },
  })),
  burnout: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: { primaryIntent: 'emotional_support', selectedAgent: 'coach', recommendedAction: index < 4 ? 'recommend_mentor' : 'ask_clarification', userState: 'blocked' },
    context: {
      ...item.context,
      lifecycleState: index < 4 ? 'paid' : 'expired',
      subscriptionStatus: index < 4 ? 'active' : 'expired',
      focusActive: false,
      primaryGoal: 'Повернути ресурс без самонасильства',
      unfinishedActionTitle: 'Зменшити навантаження до одного живого кроку',
      allowPlatformRecommendation: false,
    },
  })),
  relationships: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: { primaryIntent: index < 4 ? 'emotional_support' : 'general_support', selectedAgent: index < 4 ? 'coach' : 'assistant', recommendedAction: index < 4 ? 'recommend_mentor' : 'none', userState: index < 4 ? 'blocked' : 'planning' },
    context: {
      ...item.context,
      lifecycleState: 'paid',
      subscriptionStatus: 'active',
      focusActive: false,
      primaryGoal: 'Говорити чесно без самозради',
      unfinishedActionTitle: 'Підготувати одну чесну фразу для розмови',
      allowPlatformRecommendation: false,
    },
  })),
  career: GOAL_BLUEPRINTS.map((item) => ({
    ...item,
    context: {
      ...item.context,
      focusActive: false,
      primaryGoal: 'Прийняти доросле кар’єрне рішення',
      unfinishedActionTitle: 'Звузити наступний крок у кар’єрі',
      allowPlatformRecommendation: false,
    },
  })),
  money: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: index < 4
      ? { primaryIntent: 'emotional_support', selectedAgent: 'coach', recommendedAction: index < 2 ? 'recommend_mentor' : 'ask_clarification', userState: 'blocked' }
      : item.transport,
    context: {
      ...item.context,
      lifecycleState: index < 2 ? 'paid' : item.context.lifecycleState,
      subscriptionStatus: index < 2 ? 'active' : item.context.subscriptionStatus,
      focusActive: false,
      primaryGoal: 'Повернути собі ясність у грошових рішеннях',
      unfinishedActionTitle: 'Подивитися в одну реальну цифру',
      allowPlatformRecommendation: false,
    },
  })),
  self_esteem: GOAL_BLUEPRINTS.map((item, index) => ({
    ...item,
    transport: { primaryIntent: 'emotional_support', selectedAgent: 'coach', recommendedAction: index < 5 ? 'recommend_mentor' : 'ask_clarification', userState: 'blocked' },
    context: {
      ...item.context,
      lifecycleState: index < 5 ? 'paid' : 'onboarding',
      subscriptionStatus: index < 5 ? 'active' : 'inactive',
      focusActive: false,
      primaryGoal: 'Повернути собі внутрішню опору',
      unfinishedActionTitle: 'Назвати один доказ власної цінності',
      allowPlatformRecommendation: false,
    },
  })),
}

function createConversations(definition: CategoryDefinition): MentorGoldenConversation[] {
  return definition.prompts.map((userInput, index) => {
    const blueprint = definition.blueprints[index]
    return {
      id: `${definition.category}-${String(index + 1).padStart(2, '0')}`,
      category: definition.category,
      userInput,
      expectedCoachingObjective: blueprint.objective,
      expectedMethodologyStage: blueprint.stage,
      expectedTechnique: blueprint.technique,
      expectedNextQuestion: blueprint.nextQuestion,
      expectedTransport: blueprint.transport,
      context: blueprint.context,
    }
  })
}

const DEFINITIONS: readonly CategoryDefinition[] = (Object.keys(CATEGORY_PROMPTS) as MentorCategory[]).map((category) => ({
  category,
  prompts: CATEGORY_PROMPTS[category],
  blueprints: BLUEPRINTS_BY_CATEGORY[category],
}))

export const MENTOR_GOLDEN_CONVERSATIONS: readonly MentorGoldenConversation[] = DEFINITIONS.flatMap(createConversations)

export function getMentorGoldenConversationByInput(
  userInput: string,
): MentorGoldenConversation | null {
  return MENTOR_GOLDEN_CONVERSATIONS.find((item) => item.userInput === userInput) ?? null
}
