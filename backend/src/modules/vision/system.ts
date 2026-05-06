export type VisionSystemGoal = {
  sphere: string
  title: string
  description: string
  actions: string[]
  factors: string[]
  resources: string[]
  constraints: string[]
  solutions: string[]
  scoreFrom: number | null
  scoreTo: number | null
  timeframeMonths: number | null
}

export type VisionGraphNodeKind = 'center' | 'goal' | 'factor' | 'resource' | 'constraint' | 'solution'

export type VisionGraphNode = {
  id: string
  label: string
  kind: VisionGraphNodeKind
  parentId: string | null
  sphere: string | null
  description: string | null
}

export type VisionGraphEdge = {
  id: string
  source: string
  target: string
  label: string | null
}

export type VisionSeedExample = {
  title: string
  scoreFrom: number
  scoreTo: number
  timeframeMonths: number
  factors: string[]
  resources: string[]
  constraints: string[]
  solutions: string[]
}

export type VisionSystem = {
  statement: string
  identityStatement: string
  mainGoalSphere: string | null
  goals: VisionSystemGoal[]
  graph: {
    nodes: VisionGraphNode[]
    edges: VisionGraphEdge[]
  }
  dailyCycle: {
    trackedNodeIds: string[]
    primaryNodeId: string | null
    prompt: string
  }
  orchestrator: {
    constraints: string[]
    resources: string[]
    primaryConstraint: string | null
    recommendedFocus: string
    behaviorTags: string[]
    stage: string
  }
  seed: VisionSeedExample
}

type VisionAiGoalPayload = Partial<VisionSystemGoal> & {
  sphere?: string
  title?: string
  description?: string
}

type VisionAiPayload = {
  statement?: string
  identityStatement?: string
  mainGoalSphere?: string
  goals?: VisionAiGoalPayload[]
  dailyPrompt?: string
}

export type VisionQuestionnairePayload = {
  idealLife: string
  noLongerNormal: string
  pointB: string
}

export function parseWheelScores(value: unknown): Array<{ categoryId: string; score: number }> {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>

  return Object.entries(record)
    .filter(([key, rawValue]) => key !== '__regenCount' && typeof rawValue === 'number')
    .map(([categoryId, score]) => ({ categoryId, score: Number(score) }))
}

function normalizeStringList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
  return normalized.length > 0 ? normalized : fallback
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function safeGoal(value: unknown, fallbackSphere: string, index: number): VisionSystemGoal | null {
  const record = asObject(value)
  if (!record) return null

  const title = typeof record.title === 'string' ? record.title.trim() : ''
  if (!title) return null

  const scoreFromRaw = Number(record.scoreFrom ?? null)
  const scoreToRaw = Number(record.scoreTo ?? null)
  const timeframeRaw = Number(record.timeframeMonths ?? null)

  return {
    sphere: typeof record.sphere === 'string' && record.sphere.trim() ? record.sphere.trim() : fallbackSphere,
    title,
    description:
      typeof record.description === 'string' && record.description.trim()
        ? record.description.trim()
        : `Системний фокус ${index + 1} для переходу від поточного стану до стабільного результату.`,
    actions: normalizeStringList(record.actions, ['Зробити один помітний крок цього тижня']),
    factors: normalizeStringList(record.factors, ['Поточний стан потребує фокусу і ритму']),
    resources: normalizeStringList(record.resources, ['Внутрішня мотивація']),
    constraints: normalizeStringList(record.constraints, ['Розфокус і відкладання']),
    solutions: normalizeStringList(record.solutions, ['Один конкретний крок у календарі']),
    scoreFrom: Number.isFinite(scoreFromRaw) ? scoreFromRaw : null,
    scoreTo: Number.isFinite(scoreToRaw) ? scoreToRaw : null,
    timeframeMonths: Number.isFinite(timeframeRaw) ? timeframeRaw : null,
  }
}

export function buildSeedExample(): VisionSeedExample {
  return {
    title: 'Health',
    scoreFrom: 4,
    scoreTo: 7,
    timeframeMonths: 3,
    factors: ['нерівний сон', 'низька енергія вдень', 'пропуски відновлення'],
    resources: ['30 хв на прогулянку', 'підтримка близьких', 'можливість планувати ранок'],
    constraints: ['пізні засинання', 'хаос у графіку', 'звичка ігнорувати втому'],
    solutions: ['сон до 23:00', '3 прогулянки щотижня', 'ранковий ритуал без телефона'],
  }
}

export function parseVisionSystemContent(value: unknown): VisionSystem | null {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const parsed = JSON.parse(value) as unknown
    const record = asObject(parsed)
    if (!record) return null

    const goals = Array.isArray(record.goals)
      ? record.goals
          .map((goal, index) => safeGoal(goal, `focus-${index + 1}`, index))
          .filter((goal): goal is VisionSystemGoal => goal !== null)
      : []

    const graphRecord = asObject(record.graph)
    const nodes = Array.isArray(graphRecord?.nodes)
      ? graphRecord.nodes.reduce<VisionGraphNode[]>((acc, node) => {
          const current = asObject(node)
          if (!current || typeof current.id !== 'string' || typeof current.label !== 'string') return acc
          acc.push({
            id: current.id,
            label: current.label,
            kind: (typeof current.kind === 'string' ? current.kind : 'goal') as VisionGraphNodeKind,
            parentId: typeof current.parentId === 'string' ? current.parentId : null,
            sphere: typeof current.sphere === 'string' ? current.sphere : null,
            description: typeof current.description === 'string' ? current.description : null,
          })
          return acc
        }, [])
      : []
    const edges = Array.isArray(graphRecord?.edges)
      ? graphRecord.edges.reduce<VisionGraphEdge[]>((acc, edge) => {
          const current = asObject(edge)
          if (!current || typeof current.id !== 'string' || typeof current.source !== 'string' || typeof current.target !== 'string') return acc
          acc.push({
            id: current.id,
            source: current.source,
            target: current.target,
            label: typeof current.label === 'string' ? current.label : null,
          })
          return acc
        }, [])
      : []

    const seedRecord = asObject(record.seed)
    const dailyRecord = asObject(record.dailyCycle)
    const orchestratorRecord = asObject(record.orchestrator)

    return {
      statement:
        typeof record.statement === 'string' && record.statement.trim()
          ? record.statement.trim()
          : 'Я рухаюсь до системного життя через ясність, фокус і регулярну дію.',
      identityStatement:
        typeof record.identityStatement === 'string' && record.identityStatement.trim()
          ? record.identityStatement.trim()
          : 'Я будую систему, де мої рішення підтримують бажане життя.',
      mainGoalSphere: typeof record.mainGoalSphere === 'string' ? record.mainGoalSphere : goals[0]?.sphere ?? null,
      goals,
      graph: { nodes, edges },
      dailyCycle: {
        trackedNodeIds: normalizeStringList(dailyRecord?.trackedNodeIds, goals.slice(0, 3).map((goal) => `goal:${goal.sphere}`)),
        primaryNodeId: typeof dailyRecord?.primaryNodeId === 'string' ? dailyRecord.primaryNodeId : goals[0] ? `goal:${goals[0].sphere}` : null,
        prompt:
          typeof dailyRecord?.prompt === 'string' && dailyRecord.prompt.trim()
            ? dailyRecord.prompt.trim()
            : goals[0]
              ? `Яка одна дія сьогодні реально зрушить "${goals[0].title}"?`
              : 'Яка одна дія сьогодні реально зрушить твою головну сферу?'
      },
      orchestrator: {
        constraints: normalizeStringList(orchestratorRecord?.constraints, goals.flatMap((goal) => goal.constraints).slice(0, 4)),
        resources: normalizeStringList(orchestratorRecord?.resources, goals.flatMap((goal) => goal.resources).slice(0, 4)),
        primaryConstraint: typeof orchestratorRecord?.primaryConstraint === 'string' ? orchestratorRecord.primaryConstraint : goals[0]?.constraints[0] ?? null,
        recommendedFocus:
          typeof orchestratorRecord?.recommendedFocus === 'string' && orchestratorRecord.recommendedFocus.trim()
            ? orchestratorRecord.recommendedFocus.trim()
            : goals[0]?.title ?? 'Сфокусуйся на одному системному кроці',
        behaviorTags: normalizeStringList(orchestratorRecord?.behaviorTags, []),
        stage: typeof orchestratorRecord?.stage === 'string' ? orchestratorRecord.stage : 'trial',
      },
      seed: {
        title: typeof seedRecord?.title === 'string' ? seedRecord.title : 'Health',
        scoreFrom: Number(seedRecord?.scoreFrom ?? 4) || 4,
        scoreTo: Number(seedRecord?.scoreTo ?? 7) || 7,
        timeframeMonths: Number(seedRecord?.timeframeMonths ?? 3) || 3,
        factors: normalizeStringList(seedRecord?.factors, buildSeedExample().factors),
        resources: normalizeStringList(seedRecord?.resources, buildSeedExample().resources),
        constraints: normalizeStringList(seedRecord?.constraints, buildSeedExample().constraints),
        solutions: normalizeStringList(seedRecord?.solutions, buildSeedExample().solutions),
      },
    }
  } catch {
    return null
  }
}

export function buildVisionGraph(goals: VisionSystemGoal[], identityStatement: string): VisionSystem['graph'] {
  const centerId = 'center:vision'
  const nodes: VisionGraphNode[] = [
    {
      id: centerId,
      label: identityStatement,
      kind: 'center',
      parentId: null,
      sphere: null,
      description: 'Твоя центральна система переходу',
    },
  ]
  const edges: VisionGraphEdge[] = []

  goals.forEach((goal, index) => {
    const goalId = `goal:${goal.sphere}:${index + 1}`
    nodes.push({
      id: goalId,
      label: goal.title,
      kind: 'goal',
      parentId: centerId,
      sphere: goal.sphere,
      description: goal.description,
    })
    edges.push({
      id: `${centerId}->${goalId}`,
      source: centerId,
      target: goalId,
      label: goal.scoreFrom !== null && goal.scoreTo !== null ? `${goal.scoreFrom}→${goal.scoreTo}` : goal.sphere,
    })

    const groups: Array<{ key: 'factor' | 'resource' | 'constraint' | 'solution'; items: string[] }> = [
      { key: 'factor', items: goal.factors.slice(0, 2) },
      { key: 'resource', items: goal.resources.slice(0, 2) },
      { key: 'constraint', items: goal.constraints.slice(0, 2) },
      { key: 'solution', items: goal.solutions.slice(0, 2) },
    ]

    groups.forEach((group) => {
      group.items.forEach((item, itemIndex) => {
        const nodeId = `${goalId}:${group.key}:${itemIndex + 1}`
        nodes.push({
          id: nodeId,
          label: item,
          kind: group.key,
          parentId: goalId,
          sphere: goal.sphere,
          description: item,
        })
        edges.push({
          id: `${goalId}->${nodeId}`,
          source: goalId,
          target: nodeId,
          label: group.key,
        })
      })
    })
  })

  return { nodes, edges }
}

export function buildFallbackVisionSystem(
  answers: VisionQuestionnairePayload,
  wheelScores: Array<{ categoryId: string; score: number }>,
): VisionSystem {
  const weakest = [...wheelScores].sort((left, right) => left.score - right.score)[0]?.categoryId ?? 'health'
  const seed = buildSeedExample()
  const goals: VisionSystemGoal[] = [
    {
      sphere: weakest,
      title: weakest === 'health' ? 'Повернути тілу стабільність і енергію' : `Стабілізувати сферу ${weakest}`,
      description: `Перехід від поточного стану до нової норми через короткий системний цикл у сфері "${weakest}".`,
      actions: ['Зафіксувати одну вимірювану дію на 7 днів', 'Поставити час у календар', 'Повернутись до результату ввечері'],
      factors: weakest === 'health' ? seed.factors : ['низька регулярність', 'хаотичний фокус', 'немає опори в календарі'],
      resources: weakest === 'health' ? seed.resources : ['готовність до змін', 'внутрішня мотивація', '1 вільний слот щодня'],
      constraints: weakest === 'health' ? seed.constraints : ['відкладання', 'розфокус', 'емоційний шум'],
      solutions: weakest === 'health' ? seed.solutions : ['одна дія на день', 'чіткий тригер', 'вечірня перевірка результату'],
      scoreFrom: weakest === 'health' ? seed.scoreFrom : 4,
      scoreTo: weakest === 'health' ? seed.scoreTo : 7,
      timeframeMonths: weakest === 'health' ? seed.timeframeMonths : 3,
    },
    {
      sphere: 'relationships',
      title: 'Повернути теплий контакт з людьми',
      description: 'Поступово відновити живі зв’язки через маленькі регулярні дії.',
      actions: ['Написати одній людині', 'Запланувати одну зустріч', 'Підтримати один контакт без очікувань'],
      factors: ['ізоляція', 'зайнятість', 'звичка мовчати'],
      resources: ['2 важливі контакти', 'месенджер під рукою'],
      constraints: ['страх нав’язуватись'],
      solutions: ['коротке повідомлення без очікувань', 'одна тепла дія на тиждень'],
      scoreFrom: 5,
      scoreTo: 7,
      timeframeMonths: 3,
    },
    {
      sphere: 'career',
      title: 'Зібрати робочий ритм навколо точки Б',
      description: 'Замість хаосу — одна пріоритетна траєкторія, що підтримує твою нову ідентичність.',
      actions: ['Визначити одну ключову метрику', 'Обрати один фокус на тиждень', 'Завершувати одну важливу дію щодня'],
      factors: ['розпорошення', 'забагато задач'],
      resources: ['досвід', 'можливість перебудувати графік'],
      constraints: ['реактивний режим дня'],
      solutions: ['один пріоритет до обіду', 'щоденний review'],
      scoreFrom: 5,
      scoreTo: 8,
      timeframeMonths: 6,
    },
  ]

  const identityStatement = `Я живу з опорою на ${answers.pointB}, більше не повертаючись у ${answers.noLongerNormal}.`
  const graph = buildVisionGraph(goals, identityStatement)

  return {
    statement: `Я свідомо рухаюсь до життя, де ${answers.idealLife}. Моя нова норма — ${answers.pointB}.`,
    identityStatement,
    mainGoalSphere: goals[0]?.sphere ?? null,
    goals,
    graph,
    dailyCycle: {
      trackedNodeIds: goals.map((goal, index) => `goal:${goal.sphere}:${index + 1}`),
      primaryNodeId: `goal:${goals[0]?.sphere ?? 'health'}:1`,
      prompt: `Яка одна дія сьогодні реально зрушить "${goals[0]?.title ?? 'головну ціль'}"?`,
    },
    orchestrator: {
      constraints: [...new Set(goals.flatMap((goal) => goal.constraints))].slice(0, 5),
      resources: [...new Set(goals.flatMap((goal) => goal.resources))].slice(0, 5),
      primaryConstraint: goals[0]?.constraints[0] ?? null,
      recommendedFocus: goals[0]?.title ?? 'Один системний крок',
      behaviorTags: ['vision_system_ready', `focus:${goals[0]?.sphere ?? 'health'}`],
      stage: 'trial',
    },
    seed,
  }
}

export function normalizeVisionSystem(
  answers: VisionQuestionnairePayload,
  wheelScores: Array<{ categoryId: string; score: number }>,
  payload: VisionAiPayload | null,
): VisionSystem {
  const fallback = buildFallbackVisionSystem(answers, wheelScores)
  const goals = (payload?.goals ?? [])
    .map((goal, index) => safeGoal(goal, fallback.goals[index]?.sphere ?? `focus-${index + 1}`, index))
    .filter((goal): goal is VisionSystemGoal => goal !== null)

  const identityStatement =
    typeof payload?.identityStatement === 'string' && payload.identityStatement.trim()
      ? payload.identityStatement.trim()
      : fallback.identityStatement
  const graph = buildVisionGraph(goals.length > 0 ? goals : fallback.goals, identityStatement)

  return {
    statement:
      typeof payload?.statement === 'string' && payload.statement.trim()
        ? payload.statement.trim()
        : fallback.statement,
    identityStatement,
    mainGoalSphere:
      typeof payload?.mainGoalSphere === 'string' && payload.mainGoalSphere.trim()
        ? payload.mainGoalSphere.trim()
        : goals[0]?.sphere ?? fallback.mainGoalSphere,
    goals: goals.length > 0 ? goals : fallback.goals,
    graph,
    dailyCycle: {
      trackedNodeIds: (goals.length > 0 ? goals : fallback.goals).map((goal, index) => `goal:${goal.sphere}:${index + 1}`),
      primaryNodeId: (goals.length > 0 ? goals : fallback.goals)[0]
        ? `goal:${(goals.length > 0 ? goals : fallback.goals)[0].sphere}:1`
        : null,
      prompt:
        typeof payload?.dailyPrompt === 'string' && payload.dailyPrompt.trim()
          ? payload.dailyPrompt.trim()
          : fallback.dailyCycle.prompt,
    },
    orchestrator: fallback.orchestrator,
    seed: fallback.seed,
  }
}

export function parseVisionAiPayload(raw: string): VisionAiPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    const record = asObject(parsed)
    if (!record) return null

    return {
      statement: typeof record.statement === 'string' ? record.statement : undefined,
      identityStatement: typeof record.identityStatement === 'string' ? record.identityStatement : undefined,
      mainGoalSphere: typeof record.mainGoalSphere === 'string' ? record.mainGoalSphere : undefined,
      dailyPrompt: typeof record.dailyPrompt === 'string' ? record.dailyPrompt : undefined,
      goals: Array.isArray(record.goals) ? (record.goals as VisionAiGoalPayload[]) : undefined,
    }
  } catch {
    return null
  }
}

export function serializeVisionSystemContent(system: VisionSystem) {
  return JSON.stringify(system)
}
