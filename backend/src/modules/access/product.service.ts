import { prisma } from '../../db/client.js'
import { ensureOwnerExpertIdForUser } from '../experts/ownership.service.js'
import type { ProductAccessAssignment, ProductAccessProduct, ProductAccessRole } from './types.js'
import { isProductAccessProduct, isProductAccessRole, isProductAccessTableMissing, shouldPromoteUserRole, toUserRole } from './snapshot.service.js'

export async function getUserProductAccesses(userId: string): Promise<ProductAccessAssignment[]> {
  const rows = await prisma.productAccess.findMany({
    where: { userId },
    orderBy: [{ product: 'asc' }, { createdAt: 'desc' }],
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      return []
    }

    throw error
  })

  return rows.flatMap((row) => {
    if (!isProductAccessProduct(row.product) || !isProductAccessRole(row.role)) {
      return []
    }

    return [{
      id: row.id,
      userId: row.userId,
      product: row.product,
      role: row.role,
      createdAt: row.createdAt,
    }]
  })
}

export async function grantProductAccess(input: {
  userId: string
  product: ProductAccessProduct
  role: ProductAccessRole
}): Promise<ProductAccessAssignment> {
  const currentUser = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  })

  const assignment = await prisma.productAccess.upsert({
    where: {
      userId_product: {
        userId: input.userId,
        product: input.product,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      userId: input.userId,
      product: input.product,
      role: input.role,
    },
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      throw new Error('product_access_table_missing')
    }

    throw error
  })

  if (currentUser && shouldPromoteUserRole(currentUser.role as 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN', input.role)) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        role: toUserRole(input.role),
      },
    })
  }

  if (input.role === 'EXPERT' || input.role === 'ADMIN') {
    await ensureOwnerExpertIdForUser(input.userId).catch(() => null)
  }

  if (input.product === 'AI_MENTOR') {
    await prisma.mentorConfig.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
    }).catch(() => null)
  }

  return {
    id: assignment.id,
    userId: assignment.userId,
    product: input.product,
    role: input.role,
    createdAt: assignment.createdAt,
  }
}

export async function revokeProductAccess(input: {
  userId: string
  product: ProductAccessProduct
}): Promise<void> {
  await prisma.productAccess.delete({
    where: {
      userId_product: {
        userId: input.userId,
        product: input.product,
      },
    },
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      throw new Error('product_access_table_missing')
    }

    throw error
  })
}
