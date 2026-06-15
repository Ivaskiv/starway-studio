// FILE 4: packages/backend/src/routes/intelligence.routes.ts
// ============================================================================
 
import express from "express"
import { claudeIntelligenceService } from "../services/claude-intelligence.service.js"
 
const router = express.Router()
 
/**
 * POST /api/intelligence/message
 * Обробляє повідомлення через Claude Intelligence
 */
router.post("/message", async (req, res) => {
  try {
    const { userId, message } = req.body
 
    if (!userId || !message) {
      return res.status(400).json({ error: "Missing userId or message" })
    }
 
    // Детектуємо intent
    const intentResult = await claudeIntelligenceService.detectIntent(message)
 
    // Завантажуємо історію
    const history = await claudeIntelligenceService.getConversationHistory(userId, 10)
 
    // Генеруємо відповідь
    const aiResponse = await claudeIntelligenceService.generateResponse(
      message,
      intentResult.intent,
      history
    )
 
    // Зберігаємо в історію
    await claudeIntelligenceService.saveMessage(userId, "user", message, intentResult.intent)
    await claudeIntelligenceService.saveMessage(userId, "assistant", aiResponse.message, aiResponse.intent)
 
    res.json(aiResponse)
  } catch (error) {
    console.error("[Intelligence API] Error:", error)
    res.status(500).json({ error: "Failed to process message" })
  }
})
 
/**
 * GET /api/intelligence/history/:userId
 * Отримує історію повідомлень користувача
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params
    const history = await claudeIntelligenceService.getConversationHistory(userId, 20)
    res.json(history)
  } catch (error) {
    console.error("[Intelligence API] History fetch error:", error)
    res.status(500).json({ error: "Failed to fetch history" })
  }
})
 
export default router
 
