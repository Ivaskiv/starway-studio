import type { Prisma } from '@starway/db/prisma-client'

/*
AI marketplace
повертає топ продукти
*/

import { prisma } from "../../db/client.js";

export async function getMarketplaceProducts(): Promise<Array<Prisma.MarketplaceProductGetPayload<{ include: { product: true } }>>> {

 return prisma.marketplaceProduct.findMany({
  include:{product:true}
 })
}
