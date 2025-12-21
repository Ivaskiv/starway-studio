// routes/progress.ts
import { Router, Request, Response } from "express";
import { authRequired } from "../utils/auth-required.js";
import { sql } from "../db/client.js";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface Block {
  id: string;
  product_id: number;
  type: string;
  title: string;
  points: number;
  [key: string]: any;
}

interface UserProgress {
  id: string;
  user_id: number;
  product_id: number;
  total_points: number;
  completed_blocks: number;
  current_streak: number;
  level: number;
  last_activity_date: Date;
  total_blocks?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at?: Date | null;
  unlocked: boolean;
  created_at?: Date;
}

interface CompleteBlockBody {
  block_id: string;
  answer?: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
 email: string;
    name: string;
    role: string;  };
}

// ───────────────────────────────────────────────────────────────
// Multer Configuration
// ───────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/tasks/"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Недозволений тип файлу"));
    }
  },
});

// ───────────────────────────────────────────────────────────────
// POST /api/progress/complete-block — здати завдання
// ───────────────────────────────────────────────────────────────

router.post(
  "/complete-block",
  authRequired,
  upload.single("file"),
  async (req: Request, res: Response): Promise<Response> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as CompleteBlockBody;
    const { block_id, answer = "" } = body;
    const file = req.file;

    if (!block_id) {
      return res.status(400).json({ error: "missing_block_id" });
    }

    try {
      const blockResult = await sql`
        SELECT b.*, p.id as product_id 
        FROM blocks b
        JOIN products p ON b.product_id = p.id
        WHERE b.id = ${block_id}
      `;

      const block = blockResult[0] as Block | undefined;

      if (!block) {
        return res.status(404).json({ error: "block_not_found" });
      }

      const fileUrl = file ? `/uploads/tasks/${file.filename}` : null;
      const completionId = randomUUID();

      await sql`
        INSERT INTO block_completions (
          id, user_id, block_id, completed, user_answer, 
          file_url, points_earned, completed_at
        ) VALUES (
          ${completionId},
          ${authReq.user.id},
          ${block_id},
          ${true},
          ${answer},
          ${fileUrl},
          ${block.points},
          NOW()
        )
        ON CONFLICT (user_id, block_id) DO UPDATE SET
          completed = ${true},
          user_answer = ${answer},
          file_url = COALESCE(${fileUrl}, block_completions.file_url),
          points_earned = ${block.points},
          completed_at = NOW()
      `;

      const progressId = randomUUID();
      const progressResult = await sql`
        INSERT INTO user_progress (
          id, user_id, product_id, total_points, completed_blocks, last_activity_date
        ) VALUES (
          ${progressId},
          ${authReq.user.id},
          ${block.product_id},
          ${block.points},
          ${1},
          CURRENT_DATE
        )
        ON CONFLICT (user_id, product_id) DO UPDATE SET
          total_points = user_progress.total_points + ${block.points},
          completed_blocks = user_progress.completed_blocks + 1,
          last_activity_date = CURRENT_DATE,
          current_streak = CASE 
            WHEN user_progress.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
              THEN user_progress.current_streak + 1
            WHEN user_progress.last_activity_date < CURRENT_DATE - INTERVAL '1 day' 
              THEN 1
            ELSE user_progress.current_streak
          END,
          level = FLOOR((user_progress.total_points + ${block.points}) / 500) + 1
        RETURNING *
      `;

      const progress = progressResult[0] as UserProgress;

      return res.json({
        success: true,
        points_earned: block.points,
        file_url: fileUrl,
        progress,
      });
    } catch (err) {
      console.error("[progress] POST /complete-block error:", err);
      return res.status(500).json({ error: "complete_failed" });
    }
  }
);

// ───────────────────────────────────────────────────────────────
// GET /api/progress/:product_id — прогрес по продукту
// ───────────────────────────────────────────────────────────────

router.get("/:product_id", authRequired, async (req: Request, res: Response): Promise<Response> => {
  const { product_id } = req.params;
  const authReq = req as AuthenticatedRequest;

  try {
    const progressResult = await sql`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM blocks WHERE product_id = ${product_id}) as total_blocks
      FROM user_progress up
      WHERE up.user_id = ${authReq.user.id} AND up.product_id = ${product_id}
    `;

    const progress = progressResult[0] as UserProgress | undefined;

    if (!progress) {
      const progressId = randomUUID();
      const newProgressResult = await sql`
        INSERT INTO user_progress (id, user_id, product_id)
        VALUES (${progressId}, ${authReq.user.id}, ${product_id})
        RETURNING *,
          (SELECT COUNT(*) FROM blocks WHERE product_id = ${product_id}) as total_blocks
      `;
      
      return res.json(newProgressResult[0] as UserProgress);
    }

    return res.json(progress);
  } catch (err) {
    console.error("[progress] GET /:product_id error:", err);
    return res.status(500).json({ error: "fetch_failed" });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /api/progress/achievements/my — досягнення користувача
// ───────────────────────────────────────────────────────────────

router.get("/achievements/my", authRequired, async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthenticatedRequest;

  try {
    const achievements = await sql`
      SELECT 
        a.*,
        ua.unlocked_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua 
        ON a.id = ua.achievement_id AND ua.user_id = ${authReq.user.id}
      ORDER BY a.created_at
    `;

    return res.json(achievements as Achievement[]);
  } catch (err) {
    console.error("[progress] GET /achievements/my error:", err);
    return res.status(500).json({ error: "fetch_failed" });
  }
});

export default router;