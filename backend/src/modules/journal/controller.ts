import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getEventsByMonth, getEventsForRange } from './journal.service.js'

export async function getJournalEventsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : null
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : null
  const year = Number(req.query.year)
  const month = Number(req.query.month)

  try {
    const events =
      startDate && endDate
        ? await getEventsForRange(req.user.id, startDate, endDate)
        : await getEventsByMonth(req.user.id, year, month)

    return res.json({ success: true, events })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'invalid_month_range' || error.message === 'invalid_date_range')
    ) {
      return res.status(400).json({ error: error.message })
    }
    console.error('❌ getJournalEvents', error)
    return res.status(500).json({ error: 'server_error' })
  }
}
