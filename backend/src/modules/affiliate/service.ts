import { nanoid } from "nanoid"
import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from "../../db/client.js"

/*
Affiliate Engine

створює партнерські лінки для продуктів
кожен користувач може рекламувати продукт
і отримувати комісію
*/

export async function createAffiliateLink(
  userId: string,
  productId: string
) {

  // генеруємо короткий унікальний код партнерки
  const code = nanoid(10)

  // створюємо запис у БД
  const link = await prisma.affiliateLink.create({
    data: {
      userId,
      productId,
      code
    }
  })

  return link
}


/*
отримати всі партнерські лінки користувача
*/

export async function getUserAffiliateLinks(
  userId: string
): Promise<Array<Prisma.AffiliateLinkGetPayload<{ include: { product: true } }>>> {

  return prisma.affiliateLink.findMany({
    where: {
      userId
    },
    include: {
      product: true
    }
  })
}


/*
отримати партнерку по коду
використовується при покупці
*/

export async function getAffiliateByCode(
  code: string
): Promise<Prisma.AffiliateLinkGetPayload<{ include: { product: true; user: true } }> | null> {

  return prisma.affiliateLink.findUnique({
    where: {
      code
    },
    include: {
      product: true,
      user: true
    }
  })
}
