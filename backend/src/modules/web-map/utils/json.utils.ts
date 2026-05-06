export function stripJsonFences(value: string): string {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

export function parseJsonObject<T>(raw: string): T {
  return JSON.parse(stripJsonFences(raw)) as T
}