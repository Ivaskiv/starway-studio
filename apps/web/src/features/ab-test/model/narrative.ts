import type {
  AbTestResult,
} from './types'

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function formatParagraphs(lines: string[]): string {
  return lines.filter((line) => line.trim().length > 0).join('\n\n')
}

export function resolveNextActionCtaLabel(
  dominantBlock: AbTestResult['dominantBlock']
): string {
  switch (dominantBlock) {
    case 'state':
      return 'Почати м’яко'
    case 'goal':
      return 'Уточнити ціль'
    case 'choice':
      return 'Обрати напрям'
    case 'decision':
      return 'Зафіксувати рішення'
    case 'action':
    default:
      return 'Зробити крок'
  }
}

export function buildNextAction(dominantBlock: AbTestResult['dominantBlock']): string {
  const nextActionByBlock: Record<AbTestResult['dominantBlock'], string> = {
    state:
      'Спершу віднови ресурс: 10 хвилин без задач, а потім один маленький крок.',
    goal: 'Запиши одну ціль одним реченням і прибери все зайве.',
    choice: 'Обери лише один напрям і тимчасово закрий інші варіанти.',
    decision: 'Зафіксуй рішення одним конкретним реченням сьогодні.',
    action: 'Зроби перший крок сьогодні без додаткового планування.',
  }

  return nextActionByBlock[dominantBlock]
}

export function buildBehavioralNarrative(snapshot: {
  currentFocus?: string
  unresolvedGoal?: string
  repeatedPostponedAction?: string
  dominantBlock?: AbTestResult['dominantBlock']
  inactivityDays?: number
  repeatedRollback?: boolean
  wheelImbalance?: { weakestArea: string; score: number }
  lastMeaningfulAction?: string
  unfinishedStrategyNode?: string
  lastZoomTopic?: string
  dailyCycleInterrupted?: boolean
  emotionalPattern?: string
  momentumLevel?: 'low' | 'medium' | 'high'
}): string {
  const normalize = (value: unknown): string | null => normalizeText(value)

  const resolveRecognition = () => {
    const repeatedPostponedAction = normalize(snapshot.repeatedPostponedAction)
    const unresolvedGoal = normalize(snapshot.unresolvedGoal)
    const currentFocus = normalize(snapshot.currentFocus)
    const lastMeaningfulAction = normalize(snapshot.lastMeaningfulAction)
    const unfinishedStrategyNode = normalize(snapshot.unfinishedStrategyNode)
    const lastZoomTopic = normalize(snapshot.lastZoomTopic)
    const wheelArea = normalize(snapshot.wheelImbalance?.weakestArea)
    const inactivityDays =
      typeof snapshot.inactivityDays === 'number'
        ? snapshot.inactivityDays
        : null

    if (repeatedPostponedAction && unresolvedGoal) {
      return `Ти вже кілька разів поверталась до ${unresolvedGoal}, але сам перший крок — ${repeatedPostponedAction} — постійно переносився.`
    }

    if (repeatedPostponedAction) {
      return `Ти кілька разів поверталась до однієї й тієї ж дії: ${repeatedPostponedAction}.`
    }

    if (unresolvedGoal) {
      return `Ти вже тримаєш у полі уваги ${unresolvedGoal}.`
    }

    if (wheelArea) {
      return `У колесі найбільше просідає: ${wheelArea}.`
    }

    if (inactivityDays !== null && inactivityDays > 0) {
      return `У русі вже є пауза в ${inactivityDays} дн.`
    }

    if (lastZoomTopic) {
      return `Після Zoom у тебе лишився контекст про ${lastZoomTopic}.`
    }

    if (currentFocus) {
      return `Зараз у фокусі лишається: ${currentFocus}.`
    }

    if (lastMeaningfulAction) {
      return `Останній помітний крок був: ${lastMeaningfulAction}.`
    }

    if (unfinishedStrategyNode) {
      return `Незавершений стратегічний вузол зараз пов’язаний із: ${unfinishedStrategyNode}.`
    }

    return 'Я бачу, де рух зупинився.'
  }

  const resolveInterpretation = () => {
    switch (snapshot.dominantBlock) {
      case 'decision':
        return 'Схоже, проблема не в новій інформації, а в рішенні нарешті зафіксувати дію.'
      case 'action':
        return 'Сам крок уже зрозумілий, але його знову й знову переносять.'
      case 'goal':
        return 'Схоже, ціль ще не стала достатньо чіткою, тому рух розсипається.'
      case 'choice':
        return 'Рух гальмує саме там, де потрібно обрати один напрям і відпустити решту.'
      case 'state':
      default:
        break
    }

    if (snapshot.repeatedRollback) {
      return 'Схоже, точка зупинки повторюється в одному й тому самому місці.'
    }

    if (snapshot.dailyCycleInterrupted) {
      return 'Щоденний ритм перервався, і зараз важливо не додавати шум, а повернутися до простої дії.'
    }

    if (snapshot.emotionalPattern) {
      return `Зараз рух тримає ${snapshot.emotionalPattern}.`
    }

    if (snapshot.wheelImbalance) {
      return `Найбільше напруги зібралося у сфері "${snapshot.wheelImbalance.weakestArea}".`
    }

    if (
      typeof snapshot.inactivityDays === 'number' &&
      snapshot.inactivityDays > 0
    ) {
      return 'Пауза вже стала відчутною, але рух можна повернути без старту з нуля.'
    }

    if (snapshot.momentumLevel === 'low') {
      return 'Зараз руху бракує стійкості, тому краще не розширювати план.'
    }

    if (snapshot.momentumLevel === 'high') {
      return 'Рух уже є, йому лише потрібна одна ясна опора.'
    }

    return 'Схоже, справа не в новій інформації, а в тому, щоб зафіксувати дію.'
  }

  const resolveNextMovement = () => {
    switch (snapshot.dominantBlock) {
      case 'decision':
        return 'Почни не з нового плану, а з одного завершеного кроку.'
      case 'action':
        return 'Почни з першої конкретної дії, без додаткового планування.'
      case 'goal':
        return 'Сформулюй ціль одним реченням і прибери все зайве.'
      case 'choice':
        return 'Обери один напрям і тимчасово закрий інші варіанти.'
      case 'state':
      default:
        break
    }

    if (snapshot.wheelImbalance) {
      return 'Повернись до найбільш просілої сфери і зроби там один крок.'
    }

    if (snapshot.dailyCycleInterrupted) {
      return 'Повернись до найближчої простої дії і віднови щоденний рух.'
    }

    if (
      typeof snapshot.inactivityDays === 'number' &&
      snapshot.inactivityDays >= 7
    ) {
      return 'Повернись не до всього списку, а до найближчої дії.'
    }

    if (snapshot.repeatedRollback) {
      return 'Повернись до того самого вузла і зафіксуй одне рішення.'
    }

    if (snapshot.emotionalPattern) {
      return 'Почни з найпростішого кроку, який можна зробити без напруги.'
    }

    return 'Повернись до однієї конкретної дії.'
  }

  return formatParagraphs([
    resolveRecognition(),
    resolveInterpretation(),
    resolveNextMovement(),
  ])
}
