
/*
AI marketplace
повертає топ продукти
*/

import { prisma } from "../../db/client.js";

export async function getMarketplaceProducts(){

 return prisma.marketplaceProduct.findMany({
  include:{product:true}
 })
}