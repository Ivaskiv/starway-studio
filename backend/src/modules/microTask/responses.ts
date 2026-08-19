import type { MicroTaskResponse } from './types.js'

const responses: MicroTaskResponse[] = []

export async function createResponse(response: MicroTaskResponse) {
  responses.push(response)
  return response
}

export async function getResponsesByUser(userId: string) {
  return responses.filter(r => r.userId === userId)
}

export async function completeResponse(responseId: string, reflection?: string) {
  const existing = responses.find(r => r.id === responseId)
  if (existing) {
    existing.completed = true
    if (reflection) existing.reflection = reflection
  }
  return existing
}
