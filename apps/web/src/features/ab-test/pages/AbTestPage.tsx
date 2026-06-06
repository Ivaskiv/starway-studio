import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { FOCUS_ROUTE } from '@/features/landings/focus/content/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { selectAccessToken } from '@/features/auth/services/auth.slice'
import { getToken } from '@/features/auth/services/token'
import { getTelegramMiniAppAuthHeader } from '@/lib/miniapp/apiClient'
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { Button } from '@/ui'

type AbTestQuestion = {
  id: string
  prompt: string
  answers: Array<{
    id: string
    text: string
  }>
  behavioralType?: string
  nextQuestionId?: string | null
}

type AbTestQuestionsResponse = {
  questions: AbTestQuestion[]
  total: number
}

type AbTestProgressResponse = {
  answers: Array<{
    questionId?: string
    answerId?: string
    question_id: string
    answer_id: string
  }>
  currentIndex: number
  resultType: string | null
  status: string
}

type AbTestAnswerId = 'state' | 'goal' | 'choice' | 'decision' | 'action'
type AbTestResultType = 'STATE' | 'GOAL' | 'CHOICE' | 'DECISION' | 'ACTION'

type AbTestResult = {
  type: AbTestResultType
  dominantScore: number
  categoryBreakdown: Record<AbTestResultType, number>
  dominantBlock: 'state' | 'goal' | 'choice' | 'decision' | 'action'
  unresolvedGoal: string
  repeatedPostponedAction: string
  inactivityDays: number
  narrative: string
  nextAction: string
  nextActionCta: string
}

type StoredState = {
  currentIndex: number
  answers: Record<string, string>
  result: AbTestResult | null
  source?: 'anonymous' | 'authenticated'
}

type StoredResultRouteState = {
  result?: AbTestResult | null
}

type ResultScoreRow = {
  questionId: string
  answerId: AbTestAnswerId
  answerText: string
  score: number
  category: 'state' | 'goal' | 'choice' | 'decision' | 'action'
}

type ProgressBallState = 'done' | 'active' | 'pending'

const STORAGE_KEY = 'ab_test_pending'
const TOTAL_BALLS = 8

const DEFAULT_STATE: StoredState = {
  currentIndex: 0,
  answers: {},
  result: null,
  source: 'anonymous',
}

const DOMINANT_BLOCK_LABELS: Record<AbTestResult['dominantBlock'], string> = {
  state: 'Стан',
  goal: 'Ціль',
  choice: 'Вибір',
  decision: 'Рішення',
  action: 'Дія',
}

const RESULT_ORDER: AbTestResultType[] = [
  'STATE',
  'GOAL',
  'CHOICE',
  'DECISION',
  'ACTION',
]

const ANSWER_TO_RESULT: Record<AbTestAnswerId, AbTestResultType> = {
  state: 'STATE',
  goal: 'GOAL',
  choice: 'CHOICE',
  decision: 'DECISION',
  action: 'ACTION',
}

const ZERO_BREAKDOWN: Record<AbTestResultType, number> = {
  STATE: 0,
  GOAL: 0,
  CHOICE: 0,
  DECISION: 0,
  ACTION: 0,
}

const RESULT_TITLES: Record<string, string> = {
  state: 'Твій результат — стан.',
  goal: 'Твій результат — ціль.',
  choice: 'Твій результат — вибір.',
  decision: 'Твій результат — рішення.',
  action: 'Твій результат — дія.',
}

const RESULT_BODIES: Record<string, string> = {
  state: [
    'Схоже, ти відкладаєш важливе не тому, що тобі байдуже.',
    'Можливо, ти просто намагаєшся діяти з втоми, напруги або внутрішнього хаосу.',
    'Коли всередині немає сил, навіть простий крок здається великим.',
    '',
    'Ти можеш думати: «треба вже щось робити», але тіло і голова ніби не включаються.',
    'І тоді важливе знову переноситься.',
    'Не тому, що ти не можеш. А тому, що ти намагаєшся почати з тиску на себе.',
  ].join('\n'),
  goal: [
    'Схоже, ти відкладаєш важливе, бо всередині немає повної ясності.',
    '',
    'Ти ніби хочеш змін. Можеш думати про новий крок. Можеш навіть щось планувати.',
    "Але коли доходить до дії, з'являється сумнів:",
    '«А я точно цього хочу?» «А це справді моє?» «А якщо я йду не туди?»',
    '',
    'Коли ціль нечітка, дія не тримається.',
  ].join('\n'),
  choice: [
    'Схоже, ти відкладаєш важливе не тому, що не знаєш варіантів. Навпаки.',
    '',
    'Варіанти можуть бути. Але обрати один — страшно.',
    'Бо вибір завжди щось залишає позаду.',
    '',
    'І тоді ти можеш довго думати, порівнювати, радитись, чекати знаку.',
    'А насправді всередині є одне питання: «Що я втрачу, якщо оберу?»',
  ].join('\n'),
  decision: [
    'Схоже, ти вже багато чого розумієш.',
    'Можливо, ти навіть знаєш, що треба зробити.',
    '',
    'Але всередині немає остаточного: «Все, я це роблю.»',
    '',
    'Тому ти знову думаєш. Переносиш. Шукаєш правильний момент.',
    'Чекаєш, коли стане легше або зрозуміліше.',
    '',
    'Але без рішення дія щоразу відкладається.',
  ].join('\n'),
  action: [
    'Схоже, ти вже приблизно розумієш, чого хочеш.',
    'Можливо, рішення теж є. Але все зупиняється на конкретному кроці.',
    '',
    'Ти можеш думати про це. Планувати.',
    'Чекати часу. Чекати сил. Чекати нормального моменту.',
    '',
    'Але поки дія не стала простою і конкретною, вона залишається в голові.',
  ].join('\n'),
}

const BLOCK9_CONTENT = {
  text: [
    'Тест показав твою головну точку на зараз.',
    'Але важливо не залишити це просто розумінням.',
    '',
    'У ФОКУСІ ми раз на тиждень працюємо з такими ситуаціями наживо.',
    'Ти приходиш із реальною темою: що відкладаєш, чому переносиш, яке рішення не приймаєш.',
    '',
    'ФОКУС — це перший платний вхід в AB System.',
  ].join('\n'),
  cta: 'Хочу у ФОКУС',
}

const RESULT_ROUTE_PATH = '/ab-test/quiz/result'

function isAbTestResultType(value: unknown): value is AbTestResultType {
  return (
    typeof value === 'string' &&
    RESULT_ORDER.includes(value as AbTestResultType)
  )
}

function resolveDominantBlock(
  type: AbTestResultType
): AbTestResult['dominantBlock'] {
  return type.toLowerCase() as AbTestResult['dominantBlock']
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function formatParagraphs(lines: string[]): string {
  return lines.filter((line) => line.trim().length > 0).join('\n\n')
}

function loadStoredState(): StoredState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE

    const parsed = JSON.parse(raw) as Partial<StoredState> | null
    return {
      currentIndex:
        typeof parsed?.currentIndex === 'number' ? parsed.currentIndex : 0,
      answers:
        parsed?.answers && typeof parsed.answers === 'object'
          ? (parsed.answers as Record<string, string>)
          : {},
      result: parsed?.result ?? null,
      source:
        parsed?.source === 'authenticated' ? 'authenticated' : 'anonymous',
    }
  } catch {
    return DEFAULT_STATE
  }
}

function persistStoredState(state: StoredState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStoredState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

function buildAuthHeaders(accessToken?: string | null): Record<string, string> {
  const token = accessToken ?? getToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }

  const telegramAuth = getTelegramMiniAppAuthHeader()
  return telegramAuth ? { Authorization: telegramAuth } : {}
}

function canSyncAbTestProgress(accessToken?: string | null): boolean {
  return Boolean(buildAuthHeaders(accessToken).Authorization)
}

function buildSubmissionAnswers(
  questions: AbTestQuestion[],
  answers: Record<string, string>
) {
  const questionIds = questions.length
    ? questions.map((question) => question.id)
    : Object.keys(answers).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })
      )

  return questionIds.flatMap((questionId) => {
    const answerId = answers[questionId]
    return answerId ? [{ questionId, answerId }] : []
  })
}

function getProgressLabel(currentIndex: number, total: number) {
  return `${Math.min(currentIndex + 1, total)} / ${total}`
}

function getBallState(
  ballIndex: number,
  currentIndex: number,
  isComplete: boolean
): ProgressBallState {
  if (isComplete) return 'done'
  if (ballIndex < currentIndex) return 'done'
  if (ballIndex === currentIndex) return 'active'
  return 'pending'
}

function resolveScoreRows(
  questions: AbTestQuestion[],
  answers: Record<string, string>
): ResultScoreRow[] {
  return questions.flatMap((question) => {
    const answerId = answers[question.id]
    if (!answerId) return []

    const answerIndex = question.answers.findIndex(
      (answer) => answer.id === answerId
    )
    if (answerIndex < 0) return []

    const answer = question.answers[answerIndex]
    return [
      {
        questionId: question.id,
        answerId: answer.id as AbTestAnswerId,
        answerText: answer.text,
        score: 5 - answerIndex,
        category: answer.id as ResultScoreRow['category'],
      },
    ]
  })
}

function chooseWinner(
  categoryBreakdown: Record<AbTestResultType, number>,
  tieBreakBreakdown: Record<AbTestResultType, number>
): AbTestResultType {
  const highestScore = Math.max(
    ...RESULT_ORDER.map((type) => categoryBreakdown[type])
  )
  const topCandidates = RESULT_ORDER.filter(
    (type) => categoryBreakdown[type] === highestScore
  )

  if (topCandidates.length === 1) {
    return topCandidates[0]
  }

  const highestTieBreakScore = Math.max(
    ...topCandidates.map((type) => tieBreakBreakdown[type])
  )
  const tieBreakCandidates = topCandidates.filter(
    (type) => tieBreakBreakdown[type] === highestTieBreakScore
  )

  return tieBreakCandidates[0] ?? topCandidates[0] ?? 'STATE'
}

function resolveCanonicalTestResultLocal(
  questions: AbTestQuestion[],
  answers: Record<string, string>
) {
  const scoredAnswers = resolveScoreRows(questions, answers)
  const categoryBreakdown: Record<AbTestResultType, number> = {
    ...ZERO_BREAKDOWN,
  }
  const tieBreakBreakdown: Record<AbTestResultType, number> = {
    ...ZERO_BREAKDOWN,
  }
  const tieBreakQuestionIds = new Set(['q6', 'q7', 'q8'])

  for (const answer of scoredAnswers) {
    const resultType = ANSWER_TO_RESULT[answer.answerId]
    categoryBreakdown[resultType] += 1
    if (tieBreakQuestionIds.has(answer.questionId)) {
      tieBreakBreakdown[resultType] += 1
    }
  }

  const type = chooseWinner(categoryBreakdown, tieBreakBreakdown)

  return {
    type,
    dominantScore: categoryBreakdown[type],
    categoryBreakdown,
    scoredAnswers,
  }
}

function buildInactivityDays(scoredAnswers: ResultScoreRow[]): number {
  if (!scoredAnswers.length) return 0

  const totalScore = scoredAnswers.reduce(
    (sum, answer) => sum + answer.score,
    0
  )
  return Math.max(
    0,
    Math.min(30, Math.round((scoredAnswers.length * 5 - totalScore) / 2))
  )
}

function resolveNextActionCtaLabel(
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

function buildNextAction(dominantBlock: AbTestResult['dominantBlock']): string {
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

function buildBehavioralNarrative(snapshot: {
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

function buildAnonymousResult(
  questions: AbTestQuestion[],
  answers: Record<string, string>
): AbTestResult {
  const canonical = resolveCanonicalTestResultLocal(questions, answers)
  const dominantBlock = resolveDominantBlock(canonical.type)
  const scoredAnswers = canonical.scoredAnswers
  const goalAnswer = scoredAnswers.find((item) => item.category === 'goal')
  const actionAnswer = [...scoredAnswers].sort(
    (left, right) => left.score - right.score
  )[0]
  const dominantAnswer = scoredAnswers.find(
    (item) => item.category === dominantBlock
  )
  const inactivityDays = buildInactivityDays(scoredAnswers)

  const snapshot: Parameters<typeof buildBehavioralNarrative>[0] = {
    currentFocus:
      normalizeText(goalAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    unresolvedGoal:
      normalizeText(
        goalAnswer?.answerText ??
          dominantAnswer?.answerText ??
          'одну конкретну точку, яку потрібно зафіксувати'
      ) ?? 'одну конкретну точку, яку потрібно зафіксувати',
    repeatedPostponedAction:
      normalizeText(
        actionAnswer?.answerText ??
          'перший конкретний крок, який давно проситься в рух'
      ) ?? 'перший конкретний крок, який давно проситься в рух',
    dominantBlock,
    inactivityDays,
    repeatedRollback:
      dominantBlock === 'decision' &&
      Boolean(actionAnswer) &&
      actionAnswer.score <= 3,
    wheelImbalance: undefined as
      | { weakestArea: string; score: number }
      | undefined,
    lastMeaningfulAction:
      normalizeText(actionAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    unfinishedStrategyNode:
      normalizeText(goalAnswer?.answerText ?? dominantAnswer?.answerText) ??
      undefined,
    lastZoomTopic: undefined as string | undefined,
    dailyCycleInterrupted: inactivityDays >= 3,
    emotionalPattern:
      dominantBlock === 'state'
        ? 'напруга на старті'
        : dominantBlock === 'decision'
          ? 'напруга у виборі'
          : dominantBlock === 'action'
            ? 'напруга у першому кроці'
            : undefined,
    momentumLevel:
      dominantBlock === 'state'
        ? 'low'
        : dominantBlock === 'decision'
          ? inactivityDays >= 7
            ? 'low'
            : 'medium'
          : dominantBlock === 'action'
            ? 'medium'
            : 'high',
  }

  const categoryBreakdown = {
    ...ZERO_BREAKDOWN,
    ...canonical.categoryBreakdown,
  }

  return {
    type: canonical.type,
    dominantScore: canonical.dominantScore,
    categoryBreakdown,
    dominantBlock,
    unresolvedGoal:
      snapshot.unresolvedGoal ??
      'одну конкретну точку, яку потрібно зафіксувати',
    repeatedPostponedAction:
      snapshot.repeatedPostponedAction ??
      'перший конкретний крок, який давно проситься в рух',
    inactivityDays,
    narrative: buildBehavioralNarrative(snapshot),
    nextAction: buildNextAction(dominantBlock),
    nextActionCta: resolveNextActionCtaLabel(dominantBlock),
  }
}

function buildStoredResultFromType(type: AbTestResultType): AbTestResult {
  const dominantBlock = resolveDominantBlock(type)
  const snapshot: Parameters<typeof buildBehavioralNarrative>[0] = {
    dominantBlock,
  }

  return {
    type,
    dominantScore: 0,
    categoryBreakdown: { ...ZERO_BREAKDOWN },
    dominantBlock,
    unresolvedGoal: 'Результат збережено в акаунті.',
    repeatedPostponedAction:
      'Повернись до першого кроку, який ти визначила в тесті.',
    inactivityDays: 0,
    narrative: buildBehavioralNarrative(snapshot),
    nextAction: buildNextAction(dominantBlock),
    nextActionCta: resolveNextActionCtaLabel(dominantBlock),
  }
}

export default function AbTestPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  // [FIX] token needed for buildAuthHeaders() -> GET /progress
  const accessToken = useSelector(selectAccessToken)
  const canSyncToDb = isAuthenticated && canSyncAbTestProgress(accessToken)
  const isResultRoute = location.pathname.startsWith(RESULT_ROUTE_PATH)
  const routeState = (location.state as StoredResultRouteState | null) ?? null
  const routeStateResult = routeState?.result ?? null
  const resultTypeQuery = new URLSearchParams(location.search).get('type')

  const [questions, setQuestions] = useState<AbTestQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(DEFAULT_STATE.currentIndex)
  const [answers, setAnswers] = useState<Record<string, string>>(
    DEFAULT_STATE.answers
  )
  const [result, setResult] = useState<AbTestResult | null>(
    routeStateResult ?? DEFAULT_STATE.result
  )
  const [loading, setLoading] = useState(!isResultRoute)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [showBlock9, setShowBlock9] = useState(false)

  const handleResultCta = () => {
    setShowBlock9(true)
  }

  useEffect(() => {
    if (isResultRoute) {
      setHydrated(true)
      return
    }

    const stored = loadStoredState()
    if (!canSyncToDb && stored.result) {
      clearStoredState()
      setCurrentIndex(0)
      setAnswers({})
      setResult(null)
      setHydrated(true)
      return
    }

    setCurrentIndex(stored.currentIndex)
    setAnswers(stored.answers)
    setResult(stored.result)
    setHydrated(true)
  }, [canSyncToDb, isResultRoute])

  useEffect(() => {
    if (!hydrated || isResultRoute) return
    persistStoredState({
      currentIndex,
      answers,
      result,
      source: canSyncToDb ? 'authenticated' : 'anonymous',
    })
  }, [answers, canSyncToDb, currentIndex, hydrated, isResultRoute, result])

  useEffect(() => {
    if (!hydrated || isResultRoute || !canSyncToDb) return

    const handleUnload = () => {
      const partialAnswers = buildSubmissionAnswers(questions, answers)
      if (partialAnswers.length === 0 || partialAnswers.length >= TOTAL_BALLS) {
        return
      }

      const payload = JSON.stringify({
        answers: partialAnswers,
        partial: true,
      })
      const authHeaders = buildAuthHeaders(accessToken)

      if (authHeaders.Authorization) {
        void fetch('/api/ab-test/submit-partial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          credentials: 'include',
          keepalive: true,
          body: payload,
        })
        return
      }

      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/ab-test/submit-partial', blob)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [accessToken, answers, canSyncToDb, hydrated, isResultRoute, questions])

  useEffect(() => {
    if (!hydrated || isResultRoute) return

    let cancelled = false

    async function loadProgress() {
      if (!canSyncToDb) {
        const stored = loadStoredState()
        if (!cancelled && Object.keys(stored.answers ?? {}).length > 0) {
          setAnswers(stored.answers)
          setCurrentIndex(Math.max(0, stored.currentIndex))
        }
        return
      }

      try {
        const response = await fetch('/api/ab-test/progress', {
          credentials: 'include',
          headers: buildAuthHeaders(accessToken),
        })
        if (!response.ok) return
        const data = (await response.json()) as AbTestProgressResponse
        if (cancelled) return

        if (
          data.status === 'completed' &&
          isAbTestResultType(data.resultType)
        ) {
          setResult(buildStoredResultFromType(data.resultType))
          setCurrentIndex(TOTAL_BALLS - 1)
          return
        }

        if (Array.isArray(data.answers) && data.answers.length > 0) {
          const restored: Record<string, string> = {}
          for (const item of data.answers) {
            const questionId = item?.questionId ?? item?.question_id
            const answerId = item?.answerId ?? item?.answer_id
            if (questionId && answerId) {
              restored[questionId] = answerId
            }
          }
          setAnswers(restored)
          setCurrentIndex(
            Math.max(0, Number(data.currentIndex ?? data.answers.length))
          )
        }
      } catch {
        // keep existing state silently
      }
    }

    void loadProgress()

    return () => {
      cancelled = true
    }
  }, [accessToken, canSyncToDb, hydrated, isResultRoute])

  useEffect(() => {
    if (isResultRoute) {
      return
    }

    let cancelled = false

    async function loadQuestions() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ab-test/questions', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to load questions (${response.status})`)
        }

        const data = (await response.json()) as AbTestQuestionsResponse
        if (!cancelled) {
          setQuestions(data.questions.slice(0, 8))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load AB test'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadQuestions()

    return () => {
      cancelled = true
    }
  }, [isResultRoute])

  useEffect(() => {
    if (!isResultRoute || result) return

    if (routeStateResult) {
      setResult(routeStateResult)
      setLoading(false)
      return
    }

    if (!canSyncToDb) {
      if (isAbTestResultType(resultTypeQuery)) {
        setResult(buildStoredResultFromType(resultTypeQuery))
      } else {
        navigate('/ab-test', { replace: true })
      }
      return
    }

    let cancelled = false
    setLoading(true)

    async function loadStoredResult() {
      try {
        const response = await fetch('/api/ab-test/result', {
          credentials: 'include',
          headers: buildAuthHeaders(accessToken),
        })

        if (!response.ok) {
          throw new Error(`Failed to load AB test result (${response.status})`)
        }

        const data = (await response.json()) as Partial<AbTestResult> & {
          type?: string
        }
        if (cancelled) return

        if (isAbTestResultType(data.type)) {
          const storedResult = buildStoredResultFromType(data.type)
          setResult({
            ...storedResult,
            dominantBlock: data.dominantBlock ?? storedResult.dominantBlock,
            nextAction: data.nextAction ?? storedResult.nextAction,
            nextActionCta: data.nextActionCta ?? storedResult.nextActionCta,
          })
        } else if (isAbTestResultType(resultTypeQuery)) {
          setResult(buildStoredResultFromType(resultTypeQuery))
        } else {
          navigate('/ab-test', { replace: true })
        }
      } catch (loadError) {
        if (cancelled) return

        if (isAbTestResultType(resultTypeQuery)) {
          setResult(buildStoredResultFromType(resultTypeQuery))
        } else {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load AB test result'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStoredResult()

    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    canSyncToDb,
    isResultRoute,
    navigate,
    result,
    resultTypeQuery,
    routeStateResult,
  ])

  const currentQuestion = questions[currentIndex] ?? null
  const selectedAnswerId = currentQuestion
    ? answers[currentQuestion.id]
    : undefined
  const isLastQuestion = currentIndex === questions.length - 1
  const canAdvance = Boolean(currentQuestion && selectedAnswerId)
  const allAnswered =
    questions.length > 0 &&
    questions.every((question) => Boolean(answers[question.id]))
  const totalQuestions = questions.length || TOTAL_BALLS
  const currentBallIndex = Math.min(currentIndex, TOTAL_BALLS - 1)
  const isResultView = Boolean(result)

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion) return

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: answerId,
    }

    setAnswers(nextAnswers)

    if (canSyncToDb) {
      void fetch('/api/ab-test/submit-partial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: buildSubmissionAnswers(questions, nextAnswers),
          partial: true,
        }),
      }).catch(() => undefined)
    }
  }

  const handleBack = () => {
    setResult(null)
    setCurrentIndex((current) => Math.max(0, current - 1))
  }

  const handleNext = async () => {
    if (!currentQuestion || !selectedAnswerId) return

    if (!isLastQuestion) {
      setResult(null)
      setCurrentIndex((current) => Math.min(current + 1, questions.length - 1))
      return
    }

    if (!allAnswered) return

    if (!canSyncToDb) {
      const anonymousResult = buildAnonymousResult(questions, answers)
      setResult(anonymousResult)
      setCurrentIndex(questions.length - 1)
      persistStoredState({
        currentIndex: questions.length - 1,
        answers,
        result: anonymousResult,
        source: 'anonymous',
      })
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/ab-test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(accessToken),
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: buildSubmissionAnswers(questions, answers),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit answers (${response.status})`)
      }

      const data = (await response.json()) as AbTestResult
      setResult(data)
      setCurrentIndex(questions.length - 1)
      persistStoredState({
        currentIndex: questions.length - 1,
        answers,
        result: data,
        source: 'authenticated',
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit AB test'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setAnswers({})
    setResult(null)
    setError(null)
    clearStoredState()

    if (isResultRoute) {
      navigate('/ab-test', { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="ab-test-page">
        {/* [DESIGN] Loading state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--loading">
            <div className="ab-test-skeleton ab-test-skeleton--eyebrow" />
            <div className="ab-test-skeleton ab-test-skeleton--title" />
            <div className="ab-test-skeleton ab-test-skeleton--line" />
            <div className="ab-test-skeleton ab-test-skeleton--line ab-test-skeleton--wide" />
            <div className="ab-test-skeleton ab-test-skeleton--track" />
            <div className="ab-test-skeleton ab-test-skeleton--button" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !questions.length) {
    return (
      <div className="ab-test-page">
        {/* [DESIGN] Error state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--error">
            <p className="ab-test-kicker">ABSystem</p>
            <h1 className="ab-test-title">Не вдалося завантажити тест</h1>
            <p className="ab-test-subtitle">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ab-test-retry"
            >
              Спробувати ще раз
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    if (showBlock9) {
      return (
        <div className="ab-test-page">
          <div className="ab-test-page__frame">
            <div className="ab-test-shell ab-test-shell--result">
              <div className="ab-test-shell__header">
                <p className="ab-test-kicker">ABSystem</p>
                <h1 className="ab-test-title">Що з цим робити далі</h1>
              </div>
              <div className="ab-test-shell__body">
                <div className="ab-test-result-card">
                  <p className="ab-test-result-text ab-test-result-text--narrative">
                    {BLOCK9_CONTENT.text}
                  </p>
                </div>
              </div>
              <div className="ab-test-shell__footer">
                <button
                  type="button"
                  onClick={() => navigate(FOCUS_ROUTE)}
                  className="ab-test-result-cta"
                >
                  {BLOCK9_CONTENT.cta}
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="ab-test-nav-button ab-test-nav-button--back"
                >
                  Почати тест заново
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="ab-test-page">
        {/* [DESIGN] Result state */}
        <div className="ab-test-page__frame">
          <div className="ab-test-shell ab-test-shell--result">
            <div className="ab-test-shell__header">
              <p className="ab-test-kicker">Інтерпретація</p>
              <h1 className="ab-test-title">Ми побачили твій рух</h1>
              <p className="ab-test-subtitle">
                Нижче зібрано короткий behavioral recap та наступний крок.
              </p>
            </div>

            <div className="ab-test-shell__body">
              <div className="ab-test-result-card">
                <div className="ab-test-result-grid">
                  <div className="ab-test-result-block">
                    <p className="ab-test-result-label">Провідний блок</p>
                    <p className="ab-test-result-value">
                      {DOMINANT_BLOCK_LABELS[result.dominantBlock]}
                    </p>
                  </div>
                  <div className="ab-test-result-block">
                    <p className="ab-test-result-label">Дні паузи</p>
                    <p className="ab-test-result-value">
                      {result.inactivityDays}
                    </p>
                  </div>
                </div>

                <div className="ab-test-result-copy">
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Незавершена ціль</p>
                    <p className="ab-test-result-text">
                      {result.unresolvedGoal}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">
                      Повторювана відкладена дія
                    </p>
                    <p className="ab-test-result-text">
                      {result.repeatedPostponedAction}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Наратив</p>
                    <p className="ab-test-result-text ab-test-result-text--narrative">
                      {result.narrative}
                    </p>
                  </div>
                  <div className="ab-test-result-copy-block">
                    <p className="ab-test-result-label">Наступний крок</p>
                    <p className="ab-test-result-text">{result.nextAction}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ab-test-shell__footer">
              {!isAuthenticated ? (
                <Button
                  type="button"
                  onClick={() => navigate(isTelegramMiniApp() ? '/miniapp' : '/register?from=ab-test')}
                  variant="glass"
                  fullWidth
                >
                  Зберегти результат і отримати план
                </Button>
              ) : null}
              <button
                type="button"
                onClick={handleResultCta}
                className="ab-test-result-cta"
              >
                {result.nextActionCta}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ab-test-page">
      {/* [DESIGN] Main question shell */}
      <div className="ab-test-page__frame">
        <div className="ab-test-shell">
          <div className="ab-test-shell__header">
            <p className="ab-test-kicker">ABSystem loop</p>
            <h1 className="ab-test-title">Що зараз гальмує рух?</h1>
            <p className="ab-test-subtitle">
              Один екран, один вибір, одна точка інтерпретації.
            </p>

            <div className="ab-test-progress">
              <div className="ab-test-progress__meta">
                <span className="ab-test-progress__label">Прогрес</span>
                <span className="ab-test-progress__counter">
                  {getProgressLabel(currentIndex, totalQuestions)}
                </span>
              </div>
              <div className="ab-test-progress__track" aria-hidden="true">
                {Array.from({ length: TOTAL_BALLS }, (_, index) => {
                  const ballState = getBallState(
                    index,
                    currentBallIndex,
                    isResultView
                  )

                  return (
                    <span
                      key={index}
                      className="ab-test-progress__ball"
                      data-state={ballState}
                      data-num={index + 1}
                    >
                      {index + 1}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="ab-test-shell__body">
            {currentQuestion ? (
              <div className="ab-test-question">
                <div className="ab-test-question__meta">
                  <p className="ab-test-question__kicker">
                    Питання {currentIndex + 1} з {questions.length}
                  </p>
                  <p className="ab-test-question__counter">
                    Оберіть варіант, який зараз найближчий до вашого руху.
                  </p>
                </div>

                <h2 className="ab-test-question__title">
                  {currentQuestion.prompt}
                </h2>

                <div className="ab-test-answers">
                  {currentQuestion.answers.map((answer) => {
                    const isSelected = selectedAnswerId === answer.id

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => handleSelectAnswer(answer.id)}
                        data-selected={isSelected ? 'true' : 'false'}
                        className="ab-test-answer"
                        style={{ whiteSpace: 'normal', alignItems: 'flex-start', textAlign: 'left' }}
                      >
                        <span
                          className="ab-test-answer__dot"
                          aria-hidden="true"
                        />
                        <span
                          className="ab-test-answer__text"
                          style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                        >
                          {answer.text}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {error ? <p className="ab-test-inline-error">{error}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="ab-test-shell__footer">
            <div className="ab-test-nav">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentIndex === 0 || submitting}
                className="ab-test-nav-button ab-test-nav-button--back"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!canAdvance || submitting}
                className="ab-test-nav-button ab-test-nav-button--next"
              >
                {submitting
                  ? 'Обробка...'
                  : isLastQuestion
                    ? 'Показати результат'
                    : 'Далі'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
