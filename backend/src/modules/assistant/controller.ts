import { Request,Response } from "express"
import { assistantChat } from "./service.js"

export async function chat(req:Request,res:Response){

 const userId=req.user.id
 const {message}=req.body

 const data=await assistantChat(userId,message)

 res.json(data)
}