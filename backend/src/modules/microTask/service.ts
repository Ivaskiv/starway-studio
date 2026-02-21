// backend/src/modules/microTask/service.ts
import { MicroTask, MicroTaskResponse } from "@/modules/microTask/types.js"

const microTaskDB: MicroTask[] = []
const microTaskResponseDB: MicroTaskResponse[] = []

export const microTaskService = {
  async create(task: MicroTask) {
    microTaskDB.push(task)
    return task
  },

  async getActiveByUser(userId: string) {
    return microTaskDB.filter(
      task => task.userId === userId && task.status === 'active'
    )
  },

  async markCompleted(taskId: string) {
    const task = microTaskDB.find(t => t.id === taskId)
    if (task) task.status = 'completed'
    return task
  },

  async createResponse(response: MicroTaskResponse) {
    microTaskResponseDB.push(response)
    return response
  },

  async getResponsesByUser(userId: string) {
    return microTaskResponseDB.filter(r => r.userId === userId)
  },

  async completeResponse(responseId: string, reflection?: string) {
    const response = microTaskResponseDB.find(r => r.id === responseId)
    if (response) {
      response.completed = true
      if (reflection) response.reflection = reflection
    }
    return response
  },
}
