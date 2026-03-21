import { Router } from "express"
import { authRequired } from "../auth/middleware/auth.js"
import { createAffiliate } from "./controller.js"

const router = Router()

router.post("/create", authRequired, createAffiliate)

export default router
