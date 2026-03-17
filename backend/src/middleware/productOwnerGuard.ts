import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client.js'

export async function productOwnerGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as any).user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return next()
    }

    const productId =
      req.params.productId ??
      (req.query.productId as string | undefined) ??
      req.body?.productId

    if (!productId) {
      return res.status(400).json({ error: 'productId required' })
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, ownerId: user.id },
      select: { id: true },
    })

    if (!product) {
      return res.status(403).json({ error: 'Access denied: not your product' })
    }

    ;(req as any).productId = productId
    next()
  } catch (err) {
    console.error('[productOwnerGuard]', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
