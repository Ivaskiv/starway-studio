import type { WelcomeTestQuestion } from '@/features/welcome-test/types/welcomeTestQuestions.types'

export type WelcomeTestResultType = 'STATE' | 'GOAL' | 'CHOICE' | 'DECISION' | 'ACTION'

export type WelcomeTestDominantBlock =
  | 'state'
  | 'goal'
  | 'choice'
  | 'decision'
  | 'action'

export type WelcomeTestResultView = {
  type: WelcomeTestResultType
  dominantBlock: WelcomeTestDominantBlock
  title: string
  body: string
  nextAction: string
  nextActionCta: string
}

const RESULT_ORDER: WelcomeTestResultType[] = [
  'STATE',
  'GOAL',
  'CHOICE',
  'DECISION',
  'ACTION',
]

const DOMINANT_BLOCK_LABELS: Record<WelcomeTestDominantBlock, string> = {
  state: 'Стан',
  goal: 'Ціль',
  choice: 'Вибір',
  decision: 'Рішення',
  action: 'Дія',
}

const RESULT_TITLES: Record<WelcomeTestDominantBlock, string> = {
  state: 'Твій результат — стан.',
  goal: 'Твій результат — ціль.',
  choice: 'Твій результат — вибір.',
  decision: 'Твій результат — рішення.',
  action: 'Твій результат — дія.',
}

const RESULT_BODIES: Record<WelcomeTestDominantBlock, string> = {
  state:
    'Схоже, рух гальмує не через брак зусиль, а через втому і внутрішню напругу. Зараз важливо не тиснути на себе, а повернути ресурс і зробити один маленький крок.',
  goal:
    'Схоже, ціль ще не стала достатньо чіткою, тому важливе знову відкладається. Сформулюй один напрям одним реченням і прибери зайве.',
  choice:
    'Схоже, варіантів достатньо, але обрати один напрям страшно. Тимчасово закрий інші дороги і зафіксуй один вибір.',
  decision:
    'Схоже, інформації вже достатньо, але рішення ще не зафіксоване. Почни не з нового плану, а з одного завершеного кроку сьогодні.',
  action:
    'Схоже, крок уже зрозумілий, але його знову переносять. Зроби перший конкретний крок без додаткового планування.',
}

const NEXT_ACTION: Record<WelcomeTestDominantBlock, string> = {
  state: 'Спершу віднови ресурс, потім зроби один маленький крок.',
  goal: 'Запиши одну ціль одним реченням і прибери все зайве.',
  choice: 'Обери лише один напрям і тимчасово закрий інші варіанти.',
  decision: 'Зафіксуй рішення одним конкретним реченням сьогодні.',
  action: 'Зроби перший крок сьогодні без додаткового планування.',
}

const NEXT_ACTION_CTA: Record<WelcomeTestDominantBlock, string> = {
  state: 'Повернути ресурс',
  goal: 'Уточнити ціль',
  choice: 'Обрати напрям',
  decision: 'Зафіксувати рішення',
  action: 'Зробити крок',
}

export function isWelcomeTestResultType(value: string | null | undefined): value is WelcomeTestResultType {
  return RESULT_ORDER.includes(value as WelcomeTestResultType)
}

export function toDominantBlock(type: WelcomeTestResultType): WelcomeTestDominantBlock {
  return type.toLowerCase() as WelcomeTestDominantBlock
}

export function buildWelcomeTestResultView(
  resultType: string | null,
  questions: WelcomeTestQuestion[],
  answersMap: Record<string, string>
): WelcomeTestResultView | null {
  if (resultType && isWelcomeTestResultType(resultType)) {
    const dominantBlock = toDominantBlock(resultType)
    return {
      type: resultType,
      dominantBlock,
      title: RESULT_TITLES[dominantBlock],
      body: RESULT_BODIES[dominantBlock],
      nextAction: NEXT_ACTION[dominantBlock],
      nextActionCta: NEXT_ACTION_CTA[dominantBlock],
    }
  }

  const scored = questions.flatMap((question) => {
    const answerId = answersMap[question.id]
    if (!answerId) return []
    const answerIndex = question.answers.findIndex((answer) => answer.id === answerId)
    if (answerIndex < 0) return []
    return [
      {
        category: answerId as WelcomeTestDominantBlock,
        score: 5 - answerIndex,
      },
    ]
  })

  if (scored.length === 0) return null

  const totals: Record<WelcomeTestDominantBlock, number> = {
    state: 0,
    goal: 0,
    choice: 0,
    decision: 0,
    action: 0,
  }

  for (const row of scored) {
    totals[row.category] += row.score
  }

  const dominantBlock = (Object.keys(totals) as WelcomeTestDominantBlock[]).sort(
    (left, right) => totals[right] - totals[left]
  )[0]

  const type = dominantBlock.toUpperCase() as WelcomeTestResultType

  return {
    type,
    dominantBlock,
    title: RESULT_TITLES[dominantBlock],
    body: RESULT_BODIES[dominantBlock],
    nextAction: NEXT_ACTION[dominantBlock],
    nextActionCta: NEXT_ACTION_CTA[dominantBlock],
  }
}

export function getDominantBlockLabel(block: WelcomeTestDominantBlock): string {
  return DOMINANT_BLOCK_LABELS[block]
}
