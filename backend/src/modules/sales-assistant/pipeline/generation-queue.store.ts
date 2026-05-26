import type { GenerationJob, GenerationSession } from '@/modules/sales-assistant/pipeline/generation-queue.types.js'

export class GenerationQueueStore {
  private readonly sessions = new Map<string, GenerationSession>()
  private readonly jobsBySession = new Map<string, GenerationJob[]>()

  createSession(session: GenerationSession): void {
    this.sessions.set(session.id, session)
    this.jobsBySession.set(session.id, [])
  }

  addJobs(sessionId: string, jobs: GenerationJob[]): void {
    const current = this.jobsBySession.get(sessionId) ?? []
    this.jobsBySession.set(sessionId, [...current, ...jobs])
  }

  updateJob(sessionId: string, jobId: string, patch: Partial<GenerationJob>): GenerationJob | null {
    const jobs = this.jobsBySession.get(sessionId)
    if (!jobs) return null
    const index = jobs.findIndex((job) => job.id === jobId)
    if (index < 0) return null
    jobs[index] = { ...jobs[index], ...patch }
    return jobs[index]
  }

  updateSession(sessionId: string, patch: Partial<GenerationSession>): GenerationSession | null {
    const current = this.sessions.get(sessionId)
    if (!current) return null
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
    this.sessions.set(sessionId, next)
    return next
  }

  getSession(sessionId: string): GenerationSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  getJobs(sessionId: string): GenerationJob[] {
    return this.jobsBySession.get(sessionId) ?? []
  }
}

export const generationQueueStore = new GenerationQueueStore()
