// backend/src/modules/progress/progress.service.ts
import sql from '../../db/client.js'

export interface UserProgress {
  userId: string
  completedLessons: number
  totalLessons: number
  currentStreak: number
  points: number
  level: number
  lastActivityDate: string
}

export async function getProgressByUserId(userId: string): Promise<UserProgress | null> {
  const [result] = await sql`SELECT * FROM user_progress WHERE user_id = ${userId} LIMIT 1`
  
  if (!result) {
    return await createDefaultProgress(userId)
  }
  
  return {
    userId: result.user_id,
    completedLessons: Number(result.completed_lessons) || 0,
    totalLessons: Number(result.total_lessons) || 0,
    currentStreak: Number(result.current_streak) || 0,
    points: Number(result.total_points) || 0,
    level: Number(result.level) || 1,
    lastActivityDate: result.last_activity_date,
  }
}

async function createDefaultProgress(userId: string): Promise<UserProgress> {
  const [result] = await sql`
    INSERT INTO user_progress (user_id, completed_lessons, total_lessons, current_streak, total_points, level, last_activity_date)
    VALUES (${userId}, 0, 0, 0, 0, 1, NOW())
    RETURNING *
  `
  
  return {
    userId: result.user_id,
    completedLessons: 0,
    totalLessons: 0,
    currentStreak: 0,
    points: 0,
    level: 1,
    lastActivityDate: result.last_activity_date,
  }
}

export async function updateProgress(userId: string, data: Partial<UserProgress>): Promise<UserProgress> {
  const updates: any = {}
  
  if (data.completedLessons !== undefined) updates.completed_lessons = data.completedLessons
  if (data.totalLessons !== undefined) updates.total_lessons = data.totalLessons
  if (data.currentStreak !== undefined) updates.current_streak = data.currentStreak
  if (data.points !== undefined) updates.total_points = data.points
  if (data.level !== undefined) updates.level = data.level
  
  const [result] = await sql`
    UPDATE user_progress 
    SET ${sql(updates, ...Object.keys(updates))}, last_activity_date = NOW()
    WHERE user_id = ${userId}
    RETURNING *
  `

  return {
    userId: result.user_id,
    completedLessons: Number(result.completed_lessons),
    totalLessons: Number(result.total_lessons),
    currentStreak: Number(result.current_streak),
    points: Number(result.total_points),
    level: Number(result.level),
    lastActivityDate: result.last_activity_date,
  }
}