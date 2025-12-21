// routes/lessons-single.ts
import { Router, Request, Response } from "express";
import { getLessonById } from "../models/lessons.js";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const lesson = await getLessonById(id);

    if (!lesson) return res.status(404).json({ error: "lesson_not_found" });

    res.json(lesson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;