export function isGeneratedGoal(value: any): boolean {
  return (
    value
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && Array.isArray(value.actions)
    && typeof value.targetMonth === 'number'
  )
}

export function isGeneratedMonth(value: any): boolean {
  return (
    value
    && typeof value.month === 'number'
    && typeof value.focus === 'string'
    && Array.isArray(value.actions)
    && Array.isArray(value.goalIndexes)
  )
}

export function validateGeneratedWebMap(value: any): boolean {
  return (
    value
    && typeof value.identityStatement === 'string'
    && Array.isArray(value.goals)
    && value.goals.length === 5
    && value.goals.every(isGeneratedGoal)
    && Array.isArray(value.months)
    && value.months.length === 3
    && value.months.every(isGeneratedMonth)
  )
}