// backend/src/modules/microTask/controller.ts
import { microTaskEngine } from '@/modules/microTask/engine.js'
import { microTaskService } from '@/modules/microTask/service.js'
import { Request, Response } from 'express'

export const microTaskController = {
  async createFromAI(req: Request, res: Response) {
    const { userId, title, description, linkedQuestionId, durationDays } = req.body

    const task = microTaskEngine.createFromAI({
      userId,
      title,
      description,
      source: 'aiDecisionEngine',
      linkedQuestionId,
      durationDays,
    })

    await microTaskService.create(task)
    res.json(task)
  },

  async getActive(req: Request, res: Response) {
    const { userId } = req.params
    const tasks = await microTaskService.getActiveByUser(userId)
    res.json(tasks)
  },

  async completeTask(req: Request, res: Response) {
    const { taskId } = req.params
    const task = await microTaskService.markCompleted(taskId)
    res.json(task)
  },

  async createResponse(req: Request, res: Response) {
    const { microTaskId, userId, reflection } = req.body
    const response = microTaskEngine.createResponse(microTaskId, userId, reflection)
    await microTaskService.createResponse(response)
    res.json(response)
  },

  async getResponses(req: Request, res: Response) {
    const { userId } = req.params
    const responses = await microTaskService.getResponsesByUser(userId)
    res.json(responses)
  },

  async completeResponse(req: Request, res: Response) {
    const { responseId } = req.params
    const { reflection } = req.body
    const response = await microTaskService.completeResponse(responseId, reflection)
    res.json(response)
  },
}
