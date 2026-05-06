import type { Request, Response } from 'express'

export const dbAudit = async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'DB audit route works',
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'

    return res.status(500).json({
      success: false,
      error,
    })
  }
}
