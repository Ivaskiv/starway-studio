import { openai } from '../../../../lib/openai.js'
import { resolveAiModel } from '../../../../platform/ai.registry.js'
import { stableHash } from '../../../../services/aiGuard.service.js'
import { runRegisteredAiTask } from '../../../../services/aiTaskRunner.service.js'

export type Task = {
  id: string
  title: string
  type: 'identity' | 'action' | 'goal' | 'reflection'
  createdAt: Date
  overdueHours: number
}

type PriorityContext = {
  state: string
  lastActivityHours: number
}

const MODEL = process.env.OPENAI_MODEL?.trim() || resolveAiModel('task_priority')

export function calculateBaseScore(task: Task): number {
  let score = 0

  score += task.overdueHours * 2

  if (task.type === 'action') score += 30
  if (task.type === 'goal') score += 20
  if (task.type === 'identity') score += 10

  const ageHours = (Date.now() - task.createdAt.getTime()) / 3_600_000
  score += ageHours

  return score
}

function pickBestTaskFallback(tasks: Task[]): Task {
  return [...tasks].sort((left, right) => calculateBaseScore(right) - calculateBaseScore(left))[0] ?? tasks[0]
}

function parseTaskIndex(raw: string | null | undefined, total: number): number | null {
  const normalized = String(raw ?? '').trim()
  if (!normalized) return null

  const match = normalized.match(/\d+/)
  if (!match) return null

  const index = Number(match[0])
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    return null
  }

  return index
}

export async function pickBestTask(tasks: Task[], context: PriorityContext): Promise<Task> {
  if (!tasks.length) {
    throw new Error('pickBestTask requires at least one task')
  }

  if (tasks.length === 1) {
    return tasks[0]
  }

  try {
    const content = await runRegisteredAiTask(
      'task_priority',
      {
        userId: stableHash({ context, tasks }).slice(0, 24),
        source: 'task-priority',
        label: 'task-priority',
        payloadHash: stableHash({ context, tasks }),
        payload: {
          contextHash: stableHash(context),
          taskIds: tasks.map(task => task.id),
          taskCount: tasks.length,
        },
      },
      async () => {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0,
          max_tokens: 8,
          messages: [
            {
              role: 'system',
              content: [
                'Choose ONLY ONE task index.',
                'Priority: action > goal > identity.',
                'If the user is inactive, choose the easiest task to restart momentum.',
                'Return ONLY the index number.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify({
                context,
                tasks: tasks.map((task, index) => ({
                  index,
                  title: task.title,
                  type: task.type,
                  overdueHours: task.overdueHours,
                  createdAt: task.createdAt.toISOString(),
                })),
              }),
            },
          ],
        })

        return completion.choices[0]?.message?.content ?? ''
      },
      () => '',
    )
    const index = parseTaskIndex(content, tasks.length)
    if (index !== null) {
      return tasks[index]
    }
  } catch {
    // Safe fallback below.
  }

  return pickBestTaskFallback(tasks)
}
