import { Request, Response } from "express"
import { createAffiliateLink } from "./service.js"

/*
створює affiliate link
*/

export async function createAffiliate(req: Request, res: Response) {

  const userId = req.user.id
  const { productId } = req.body

  const link = await createAffiliateLink(userId, productId)

  res.json(link)
}