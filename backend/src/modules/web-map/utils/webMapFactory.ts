export type WheelScores = Record<string, number>

type WebMapAiGoal = {
  sphere?: string
  title?: string
  description?: string
  actions?: string[]
}

type WebMapAiPayload = {
  vision?: string
  identityStatement?: string
  mainGoalSphere?: string
  goals?: WebMapAiGoal[]
}

type PreparedGoal = {
  sphere: string
  title: string
  description: string
  actions: string[]
  isMain: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeSphere(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

export function getWeakAreas(wheelScores: WheelScores) {
  return Object.entries(wheelScores)
    .sort((left, right) => left[1] - right[1])
    .slice(0, 3)
    .map(([sphere]) => sphere)
}

function buildFallbackGoals(weakAreas: string[]): PreparedGoal[] {
  const areas = weakAreas.length > 0 ? weakAreas : ['energy', 'focus', 'balance']

  return areas.map((sphere, index) => ({
    sphere,
    title: `Фокус на сфері "${sphere}"`,
    description: `Поступово підсилити сферу "${sphere}" через прості регулярні дії.`,
    actions: [
      `Описати бажаний результат у сфері "${sphere}"`,
      'Вибрати один вимірюваний крок на цей тиждень',
      'Повернутися до прогресу наприкінці тижня',
    ],
    isMain: index === 0,
  }))
}

function parseWebMapAiPayload(raw: string): WebMapAiPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    const record = asRecord(parsed)
    if (!record) return null

    const goals = Array.isArray(record.goals)
      ? record.goals.reduce<WebMapAiGoal[]>((acc, item) => {
          const goal = asRecord(item)
          if (!goal) return acc

          const actions = Array.isArray(goal.actions)
            ? goal.actions.filter((action): action is string => typeof action === 'string' && action.trim().length > 0)
            : undefined

          acc.push({
            sphere: typeof goal.sphere === 'string' ? goal.sphere : undefined,
            title: typeof goal.title === 'string' ? goal.title : undefined,
            description: typeof goal.description === 'string' ? goal.description : undefined,
            actions,
          })
          return acc
        }, [])
      : undefined

    return {
      vision: typeof record.vision === 'string' ? record.vision : undefined,
      identityStatement: typeof record.identityStatement === 'string' ? record.identityStatement : undefined,
      mainGoalSphere: typeof record.mainGoalSphere === 'string' ? record.mainGoalSphere : undefined,
      goals,
    }
  } catch {
    return null
  }
}

export function buildWebMapDraft(raw: string, weakAreas: string[]) {
  const aiPayload = parseWebMapAiPayload(raw)
  const goals = (aiPayload?.goals ?? [])
    .map((goal, index) => {
      const title = goal.title?.trim()
      if (!title) return null

      const sphere = normalizeSphere(goal.sphere, weakAreas[index] ?? `focus-${index + 1}`)
      return {
        sphere,
        title,
        description: goal.description?.trim() || `План розвитку для сфери "${sphere}".`,
        actions: goal.actions && goal.actions.length > 0
          ? goal.actions
          : ['Сформулювати один чіткий крок на найближчі 7 днів'],
        isMain: sphere === aiPayload?.mainGoalSphere || index === 0,
      }
    })
    .filter((goal): goal is PreparedGoal => goal !== null)

  return {
    vision: aiPayload?.vision?.trim() || 'Річна стратегія зібрана на базі поточного стану та слабких сфер.',
    identityStatement: aiPayload?.identityStatement?.trim() || 'Я рухаюся через ясність, ритм і послідовну дію.',
    goals: goals.length > 0 ? goals : buildFallbackGoals(weakAreas),
  }
}
