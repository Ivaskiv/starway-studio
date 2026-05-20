import { prisma } from '../../db/client.js'

import {
  cacheDel,
  cacheGet,
  cacheSet,
} from '../../lib/cache/index.js'

import {
  invalidateDailyHistoryCache,
  invalidateDayCache,
  setCachedEntryByDate,
} from '../../lib/db/dailyCache.js'

import {
  getDayBounds,
  getSessionMeta,
  mergeSessionMeta,
} from './daily-cycle.helpers.js'

import { generateMicroTasksFromEntry } from '../microTask/service.js'

export function queueMorningMicroTaskGeneration(
  userId: string,
  entryId: string,
) {
  setImmediate(async () => {
    try {
      await generateMicroTasksFromEntry(
        userId,
        entryId,
      )
    } catch (error) {
      console.error(
        '[daily-cycle] microtask generation failed',
        error,
      )
    }
  })
}

export async function regenerateMorningMicroTaskGeneration(
  userId: string,
  entryId: string,
) {
  const entry =
    await prisma.dailyEntry.findUnique({
      where: {
        id: entryId,
      },
      select: {
        id: true,
        userId: true,
        content: true,
        date: true,
      },
    })

  if (
    !entry ||
    entry.userId !== userId
  ) {
    throw new Error(
      'daily_entry_not_found',
    )
  }

  const morningMeta =
    getSessionMeta(
      entry.content,
      'morning',
    )

  if (
    typeof morningMeta.microTasksRegeneratedAt ===
    'string'
  ) {
    throw new Error(
      'microtasks_regeneration_limit_reached',
    )
  }

  const generated =
    await generateMicroTasksFromEntry(
      userId,
      entryId,
      {
        replaceExisting: true,
      },
    )

  const nextContent =
    mergeSessionMeta(
      entry.content,
      'morning',
      {
        microTasksRegeneratedAt:
          new Date().toISOString(),
      },
    )

  await prisma.dailyEntry.update({
    where: {
      id: entryId,
    },
    data: {
      content: nextContent,
    },
  })

  await invalidateDayCache(
    userId,
    entry.date,
  )

  await invalidateDailyHistoryCache(userId)

  await setCachedEntryByDate(
    userId,
    entry.date,
    {
      ...entry,
      content: nextContent,
    } as unknown as Record<
      string,
      unknown
    >,
  )

  return generated
}

async function resolveEntryUserId(
  entryId: string,
) {
  const entry =
    await prisma.dailyEntry.findUnique({
      where: {
        id: entryId,
      },
      select: {
        userId: true,
      },
    })

  return entry?.userId ?? null
}

export async function getMicroTasks(
  entryId: string,
) {
  const cacheKey = `microtasks:entry:${entryId}`

  const cached =
    await cacheGet(cacheKey)

  if (cached !== null) {
    return cached
  }

  const userId =
    await resolveEntryUserId(
      entryId,
    )

  if (!userId) {
    return []
  }

  const tasks =
    await prisma.microTask.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

  await cacheSet(
    cacheKey,
    tasks,
    60,
  )

  return tasks
}

export async function completeMicroTask(
  entryId: string,
  taskId: string,
): Promise<
  Awaited<
    ReturnType<
      typeof prisma.microTask.findUnique
    >
  > | null
> {
  const userId =
    await resolveEntryUserId(
      entryId,
    )

  if (!userId) {
    return null
  }

  const result =
    await prisma.microTask.updateMany({
      where: {
        id: taskId,
        userId,
      },
      data: {
        status: 'done',
        isCompleted: true,
        completedAt:
          new Date(),
      },
    })

  if (!result.count) {
    return null
  }

  await cacheDel(
    `microtasks:entry:${entryId}`,
  )

  await invalidateDayCache(userId)

  await invalidateDailyHistoryCache(userId)

  return prisma.microTask.findUnique({
    where: {
      id: taskId,
    },
  })
}

export async function resolveEveningMicroTasks(
  userId: string,
  date: string,
) {
  const {
    dayEnd,
    nextDayEnd,
  } = getDayBounds(
    new Date(date),
  )

  const tasks =
    await prisma.microTask.findMany({
      where: {
        userId,
        status: 'active',
        OR: [
          {
            dueAt: null,
          },
          {
            dueAt: {
              lte: dayEnd,
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        stepsCompleted: true,
        daysToComplete: true,
      },
    })

  if (!tasks.length) {
    return {
      carriedOver: [],
      closed: [],
    }
  }

  const carriedOver: string[] = []

  const closed: string[] = []

  for (const task of tasks) {
    const stepsCompleted =
      Array.isArray(
        task.stepsCompleted,
      )
        ? task.stepsCompleted.map(
            Boolean,
          )
        : []

    const hasStarted =
      stepsCompleted.some(Boolean)

    if (hasStarted) {
      await prisma.microTask.update({
        where: {
          id: task.id,
        },
        data: {
          dueAt: nextDayEnd,
          daysToComplete:
            Math.min(
              3,
              Math.max(
                1,
                task.daysToComplete ??
                  1,
              ) + 1,
            ),
        },
      })

      carriedOver.push(
        task.title,
      )

      continue
    }

    await prisma.microTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: 'skipped',
        isCompleted: false,
        completedAt: null,
      },
    })

    closed.push(task.title)
  }

  return {
    carriedOver,
    closed,
  }
}