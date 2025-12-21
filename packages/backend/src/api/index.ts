// src/api/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sql } from "../../db/client.js";

// Імпорт routes
import integrationsRouter from "../routes/integrations.js";
import funnelsRouter from "../routes/funnels.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash?: string;
}

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface AuthRequest extends Request {
  user: User;
}

interface JwtPayload {
  id: string;
  role: string;
}

// ───────────────────────────────────────────────────────────────
// Middleware
// ───────────────────────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ───────────────────────────────────────────────────────────────
// Auth Middleware
// ───────────────────────────────────────────────────────────────

const authRequired = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "server_error" });
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    const userResult = await sql`
      SELECT id, email, name, role FROM users WHERE id = ${decoded.id}
    `;
    
    const user = userResult[0] as User | undefined;
    
    if (!user) {
      return res.status(401).json({ error: "user_not_found" });
    }
    
    (req as AuthRequest).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
};

// ───────────────────────────────────────────────────────────────
// Auth Routes
// ───────────────────────────────────────────────────────────────

app.post("/auth/register", async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as RegisterBody;
  const { email, password, name } = body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const existsResult = await sql`
      SELECT 1 FROM users WHERE email = ${email}
    `;
    
    if (existsResult[0]) {
      return res.status(409).json({ error: "email_exists" });
    }

    const countResult = await sql`
      SELECT COUNT(*) as c FROM users
    `;
    
    const count = Number((countResult[0] as { c: number }).c);
    const role = count === 0 ? "super_admin" : "user";

    const hash = await bcrypt.hash(password, 10);

    const userResult = await sql`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (
        ${crypto.randomUUID()}, 
        ${email}, 
        ${hash}, 
        ${name || email.split("@")[0]}, 
        ${role}
      )
      RETURNING id, email, name, role
    `;

    const user = userResult[0] as User;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "server_error" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      secret, 
      { expiresIn: "30d" }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("[auth] REGISTER ERROR:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

app.post("/auth/login", async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as LoginBody;
  const { email, password } = body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const userResult = await sql`
      SELECT id, email, name, role, password_hash FROM users WHERE email = ${email}
    `;

    const user = userResult[0] as User | undefined;

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "server_error" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      secret, 
      { expiresIn: "30d" }
    );

    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (err) {
    console.error("[auth] LOGIN ERROR:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ───────────────────────────────────────────────────────────────
// API Routes
// ───────────────────────────────────────────────────────────────

app.get("/api/me", authRequired, (req: Request, res: Response): Response => {
  const authReq = req as AuthRequest;
  return res.json({ user: authReq.user });
});

app.use("/api/integrations", authRequired, integrationsRouter);
app.use("/api/funnels", authRequired, funnelsRouter);

// ───────────────────────────────────────────────────────────────
// Root
// ───────────────────────────────────────────────────────────────

app.get("/", (req: Request, res: Response): Response => {
  return res.json({ message: "Starway Backend працює!" });
});

// ───────────────────────────────────────────────────────────────
// Server Start
// ───────────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Backend на http://localhost:${PORT}`);
  });
}

export default app;