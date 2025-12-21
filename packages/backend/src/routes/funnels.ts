// routes/funnels.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";
import OpenAI from "openai";
import { decrypt } from "../helpers/crypto.js";

const router = Router();

// Helper: отримати OpenAI клієнт
async function getOpenAIClient(userId: string): Promise<OpenAI> {
  const [user] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
  
  if (user.plan === 'enterprise') {
    const [integration] = await sql`
      SELECT credentials FROM user_integrations 
      WHERE user_id = ${userId} AND integration_type = 'openai' AND connected = true
    `;
    
    if (integration?.credentials?.apiKey) {
      return new OpenAI({ apiKey: decrypt(integration.credentials.apiKey)! });
    }
  }
  
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Helper: перевірка та оновлення лімітів GPT
async function checkAndIncrementGPTLimit(userId: string): Promise<void> {
  const [user] = await sql`SELECT plan, limits FROM users WHERE id = ${userId}`;
  
  if (user.plan === 'pro' || user.plan === 'enterprise') {
    return;
  }
  
  const limits = user.limits as any;
  if (limits.gptRequests >= limits.gptRequestsMax) {
    throw new Error('GPT_LIMIT_REACHED');
  }
  
  limits.gptRequests = (limits.gptRequests || 0) + 1;
  await sql`UPDATE users SET limits = ${JSON.stringify(limits)}::jsonb WHERE id = ${userId}`;
}

// Helper: запис використання API
async function logAPIUsage(userId: string, service: string, tokensUsed: number, cost: number): Promise<void> {
  await sql`
    INSERT INTO api_usage (user_id, service, operation, tokens_used, cost, metadata)
    VALUES (
      ${userId}, 
      ${service}, 
      'chat_completion', 
      ${tokensUsed}, 
      ${cost},
      ${JSON.stringify({ timestamp: new Date() })}::jsonb
    )
  `;
}

// GET /api/funnels
router.get("/", async (req: Request, res: Response) => {
  try {
    const funnels = await sql`
      SELECT * FROM funnels 
      WHERE user_id = ${req.user.id} 
      ORDER BY created_at DESC
    `;
    res.json(funnels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/funnels/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [funnel] = await sql`
      SELECT * FROM funnels 
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
    `;
    
    if (!funnel) {
      return res.status(404).json({ error: "not_found" });
    }
    
    res.json(funnel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/funnels
router.post("/", async (req: Request, res: Response) => {
  const { name, type, niche, useGPT } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: "missing_fields" });
  }
  
  try {
    const [user] = await sql`SELECT plan, limits FROM users WHERE id = ${req.user.id}`;
    const funnelCount = await sql`
      SELECT COUNT(*) as count FROM funnels WHERE user_id = ${req.user.id}
    `;
    
    if (user.plan === 'free' && Number(funnelCount[0].count) >= (user.limits as any).funnelsMax) {
      return res.status(403).json({ error: "FUNNEL_LIMIT_REACHED" });
    }
    
    let steps: any[] = [];
    
    if (useGPT && niche) {
      await checkAndIncrementGPTLimit(req.user.id);
      
      const openai = await getOpenAIClient(req.user.id);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: `Створи воронку для ${type} в ніші: ${niche}. JSON масив кроків:
[{"order":1,"delay":0,"content":{"text":"українською","buttons":[{"text":"Кнопка","action":"next"}]}}]`
          },
          { role: 'user', content: `Створи воронку на 5-7 днів` }
        ],
        temperature: 0.7
      });
      
      const response = completion.choices[0].message.content || '';
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        steps = JSON.parse(jsonMatch[0]).map((step: any, idx: number) => ({
          ...step,
          id: `step_${Date.now()}_${idx}`
        }));
      }
      
      const tokensUsed = completion.usage?.total_tokens || 0;
      await logAPIUsage(req.user.id, 'openai', tokensUsed, (tokensUsed / 1000) * 0.045);
    }
    
    const [funnel] = await sql`
      INSERT INTO funnels (user_id, name, type, steps, settings)
      VALUES (
        ${req.user.id},
        ${name},
        ${type},
        ${JSON.stringify(steps)}::jsonb,
        ${JSON.stringify({ niche: niche || null, generatedWithGPT: useGPT || false })}::jsonb
      )
      RETURNING *
    `;
    
    const limits = user.limits as any;
    limits.funnels = Number(funnelCount[0].count) + 1;
    await sql`UPDATE users SET limits = ${JSON.stringify(limits)}::jsonb WHERE id = ${req.user.id}`;
    
    res.json(funnel);
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'GPT_LIMIT_REACHED') {
      return res.status(403).json({ error: "GPT_LIMIT_REACHED" });
    }
    
    res.status(500).json({ error: "server_error" });
  }
});

// PUT /api/funnels/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const [existing] = await sql`
      SELECT id FROM funnels WHERE id = ${req.params.id} AND user_id = ${req.user.id}
    `;
    
    if (!existing) {
      return res.status(404).json({ error: "not_found" });
    }
    
    const [funnel] = await sql`
      UPDATE funnels 
      SET name = ${req.body.name || sql`name`},
          status = ${req.body.status || sql`status`},
          steps = ${req.body.steps ? JSON.stringify(req.body.steps) : sql`steps`}::jsonb
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    
    res.json(funnel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/funnels/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [funnel] = await sql`
      DELETE FROM funnels 
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING id
    `;
    
    if (!funnel) {
      return res.status(404).json({ error: "not_found" });
    }
    
    const [user] = await sql`SELECT limits FROM users WHERE id = ${req.user.id}`;
    const limits = user.limits as any;
    limits.funnels = Math.max(0, (limits.funnels || 0) - 1);
    await sql`UPDATE users SET limits = ${JSON.stringify(limits)}::jsonb WHERE id = ${req.user.id}`;
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/funnels/improve-text
router.post("/improve-text", async (req: Request, res: Response) => {
  const { text, context } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "missing_text" });
  }
  
  try {
    await checkAndIncrementGPTLimit(req.user.id);
    
    const openai = await getOpenAIClient(req.user.id);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Покращ текст для ${context || 'маркетингу'}. Емоційно, переконливо. Українською. Тільки текст.` },
        { role: 'user', content: text }
      ],
      temperature: 0.7
    });
    
    const improved = completion.choices[0].message.content;
    
    const tokensUsed = completion.usage?.total_tokens || 0;
    await logAPIUsage(req.user.id, 'openai', tokensUsed, (tokensUsed / 1000) * 0.045);
    
    res.json({ text: improved });
  } catch (err: any) {
    console.error(err);
    
    if (err.message === 'GPT_LIMIT_REACHED') {
      return res.status(403).json({ error: "GPT_LIMIT_REACHED" });
    }
    
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/funnels/stats/gpt-usage
router.get("/stats/gpt-usage", async (req: Request, res: Response) => {
  try {
    const [user] = await sql`SELECT plan, limits FROM users WHERE id = ${req.user.id}`;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const usage = await sql`
      SELECT 
        COUNT(*) as requests,
        SUM(tokens_used) as total_tokens,
        SUM(cost) as total_cost
      FROM api_usage
      WHERE user_id = ${req.user.id} 
        AND service = 'openai' 
        AND created_at >= ${startDate.toISOString()}
    `;
    
    res.json({
      requests: Number(usage[0].requests) || 0,
      tokens: Number(usage[0].total_tokens) || 0,
      cost: parseFloat(usage[0].total_cost || 0).toFixed(4),
      limit: (user.limits as any).gptRequestsMax,
      remaining: user.plan === 'free' 
        ? Math.max(0, (user.limits as any).gptRequestsMax - (user.limits as any).gptRequests)
        : -1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;