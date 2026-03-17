import { Router } from "express"
import { createAffiliate } from "./controller.js"

const router = Router()

router.post("/create", createAffiliate)

export default router