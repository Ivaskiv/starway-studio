import { prisma as dbPrisma, withRetry } from '@starway/db'
import type { PrismaClient as GeneratedPrismaClient } from '@starway/db/prisma-client'

export const prisma: GeneratedPrismaClient = dbPrisma as unknown as GeneratedPrismaClient

const REQUIRED_ZOOM_ATTENDEE_COLUMNS = [
  'selfReportedAttended',
  'selfReportedAt',
] as const

/**
 * Fail startup explicitly when generated Prisma fields have not reached the
 * canonical database. This is a read-only guard; it never repairs schema.
 */
export async function assertZoomAttendanceCheckpointSchema(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ZoomSessionAttendee'
        AND column_name IN ('selfReportedAttended', 'selfReportedAt')`,
  )
  const present = new Set(rows.map((row) => row.column_name))
  const missing = REQUIRED_ZOOM_ATTENDEE_COLUMNS.filter((column) => !present.has(column))

  if (missing.length > 0) {
    throw new Error(
      `[DB_SCHEMA_DRIFT] ZoomSessionAttendee is missing ${missing.join(', ')}; apply reviewed Prisma migrations before starting runtime`,
    )
  }
}

export async function ensureDbConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
    await assertZoomAttendanceCheckpointSchema()
  } catch (error) {
    console.warn('[prisma] connection check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export { withRetry }
