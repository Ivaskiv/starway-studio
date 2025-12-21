// routes/integrations.ts
import { Router, Request, Response } from "express";
import { sql } from "../db/client.js";
import { encrypt, decrypt } from "../helpers/crypto.js";
import crypto from "crypto";

const router = Router();

// GET /api/integrations
router.get("/", async (req: Request, res: Response) => {
  try {
    const integrations = await sql`
      SELECT integration_type, connected, metadata, created_at
      FROM user_integrations
      WHERE user_id = ${req.user.id}
    `;
    res.json(integrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/integrations/telegram/connect
router.post("/telegram/connect", async (req: Request, res: Response) => {
  try {
    const botUsername = `${req.user.id.slice(0, 8)}_funnel_bot`;
    const botToken = `${Date.now()}:FAKE_TOKEN_${crypto.randomBytes(16).toString('hex')}`;
    
    await sql`
      INSERT INTO user_integrations (user_id, integration_type, connected, credentials, metadata)
      VALUES (
        ${req.user.id},
        'telegram_bot',
        true,
        ${JSON.stringify({ botToken: encrypt(botToken) })}::jsonb,
        ${JSON.stringify({ botUsername, botLink: `https://t.me/${botUsername}` })}::jsonb
      )
      ON CONFLICT (user_id, integration_type) 
      DO UPDATE SET 
        connected = true,
        credentials = ${JSON.stringify({ botToken: encrypt(botToken) })}::jsonb,
        metadata = ${JSON.stringify({ botUsername, botLink: `https://t.me/${botUsername}` })}::jsonb
    `;
    
    res.json({ success: true, botUsername, botLink: `https://t.me/${botUsername}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "connection_failed" });
  }
});

// POST /api/integrations/wayforp/connect
router.post("/wayforp/connect", async (req: Request, res: Response) => {
  const { merchantAccount, secretKey } = req.body;
  
  if (!merchantAccount || !secretKey) {
    return res.status(400).json({ error: "missing_credentials" });
  }
  
  try {
    await sql`
      INSERT INTO user_integrations (user_id, integration_type, connected, credentials, metadata)
      VALUES (
        ${req.user.id},
        'wayforp',
        true,
        ${JSON.stringify({ merchantAccount, secretKey: encrypt(secretKey) })}::jsonb,
        ${JSON.stringify({ merchantAccount })}::jsonb
      )
      ON CONFLICT (user_id, integration_type) 
      DO UPDATE SET 
        connected = true,
        credentials = ${JSON.stringify({ merchantAccount, secretKey: encrypt(secretKey) })}::jsonb
    `;
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "connection_failed" });
  }
});

// POST /api/integrations/openai/connect
router.post("/openai/connect", async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: "missing_api_key" });
  }
  
  try {
    const [user] = await sql`SELECT plan FROM users WHERE id = ${req.user.id}`;
    if (user.plan !== 'enterprise') {
      return res.status(403).json({ error: "enterprise_only" });
    }
    
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!testResponse.ok) {
      return res.status(400).json({ error: "invalid_api_key" });
    }
    
    await sql`
      INSERT INTO user_integrations (user_id, integration_type, connected, credentials, metadata)
      VALUES (
        ${req.user.id},
        'openai',
        true,
        ${JSON.stringify({ apiKey: encrypt(apiKey) })}::jsonb,
        ${JSON.stringify({ verified: true, verifiedAt: new Date() })}::jsonb
      )
      ON CONFLICT (user_id, integration_type) 
      DO UPDATE SET 
        connected = true,
        credentials = ${JSON.stringify({ apiKey: encrypt(apiKey) })}::jsonb
    `;
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "connection_failed" });
  }
});

// POST /api/integrations/:type/disconnect
router.post("/:type/disconnect", async (req: Request, res: Response) => {
  try {
    await sql`
      DELETE FROM user_integrations 
      WHERE user_id = ${req.user.id} AND integration_type = ${req.params.type}
    `;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;