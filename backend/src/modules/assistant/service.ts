
/*
AI assistant
аналізує стан користувача
*/

import { prisma } from "../../db/client.js"
import { generateAI } from "../wheel/ai.js"

export async function assistantChat(userId:string,message:string){

 const products = await prisma.product.findMany({
  where:{ownerId:userId}
 })

 const prompt = `
user products: ${products.length}

user message:
${message}
`

 const reply = await generateAI(prompt)

 return {
  message:reply
 }
}