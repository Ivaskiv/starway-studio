import type { Request, Response } from 'express'
import { microTaskEngine } from './engine.js'
import {
  completeMicroTask,
  createMicroTask,
  getMicroTaskStats,
  getResponsesByUser,
  getUserMicroTasks,
  completeResponse,
  createResponse,
} from './service.js'

export async function createFromAI(req: Request, res: Response) {
  try {
    const { userId, title, description, linkedQuestionId, durationDays } = req.body
    const taskPayload = microTaskEngine.createFromAI({
      userId,
      title,
      description,
      source: 'wheel',
      linkedQuestionId,
      durationDays,
    })

    const task = await createMicroTask({
      userId: taskPayload.userId,
      title: taskPayload.title,
      description: taskPayload.description,
      linkedQuestionId: taskPayload.linkedQuestionId,
      source: taskPayload.source as 'wheel',
      dueDate: taskPayload.expiresAt,
    })

    return res.json(task)
  } catch (err) {
    console.error('[microTask] createFromAI error', err)
    return res.status(500).json({ error: 'Failed to create microtask' })
  }
}

export async function getActive(req: Request, res: Response) {
  try {
    const { userId } = req.params
    const tasks = await getUserMicroTasks(userId)
    return res.json({ tasks })
  } catch (err) {
    console.error('[microTask] getActive error', err)
    return res.status(500).json({ error: 'Failed to get tasks' })
  }
}

export async function completeTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params
    await completeMicroTask(taskId, req.body.userId ?? req.params.userId)
    return res.json({ success: true })
  } catch (err) {
    console.error('[microTask] completeTask error', err)
    return res.status(500).json({ error: 'Failed to complete task' })
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const { userId } = req.params
    const stats = await getMicroTaskStats(userId)
    return res.json(stats)
  } catch (err) {
    console.error('[microTask] stats error', err)
    return res.status(500).json({ error: 'Failed to get stats' })
  }
}

export async function createResponseHandler(req: Request, res: Response) {
  try {
    const { microTaskId, userId, reflection } = req.body
    const response = microTaskEngine.createResponse(microTaskId, userId, reflection)
    const created = await createResponse(response)
    return res.json(created)
  } catch (err) {
    console.error('[microTask] createResponse error', err)
    return res.status(500).json({ error: 'Failed to create response' })
  }
}

export async function getResponses(req: Request, res: Response) {
  try {
    const { userId } = req.params
    const responses = await getResponsesByUser(userId)
    return res.json(responses)
  } catch (err) {
    console.error('[microTask] getResponses error', err)
    return res.status(500).json({ error: 'Failed to get responses' })
  }
}

export async function completeResponseHandler(req: Request, res: Response) {
  try {
    const { responseId } = req.params
    const { reflection } = req.body
    const response = await completeResponse(responseId, reflection)
    return res.json(response)
  } catch (err) {
    console.error('[microTask] completeResponse error', err)
    return res.status(500).json({ error: 'Failed to complete response' })
  }
}
