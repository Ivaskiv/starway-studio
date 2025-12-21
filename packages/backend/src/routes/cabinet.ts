// routes/cabinet.ts
import { Router, Request, Response } from "express";
import {
  getUser,
  getProducts,
  getEnrollments,
  getProgress,
  getMiniapps,
  getMiniappPurchases
} from "../models/cabinet.js";
import {
  normalizeUser,
  buildProductItem,
  buildMiniappItem
} from "../utils/cabinet.js";
import { CabinetResponse } from "@starway/shared";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userIdStr = req.user?.id;
    
    if (!userIdStr) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const userId = parseInt(userIdStr, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const [user, products, enrollments, progress, miniapps, purchased] = 
      await Promise.all([
        getUser(userId),
        getProducts(),
        getEnrollments(userId),
        getProgress(userId),
        getMiniapps(),
        getMiniappPurchases(userId)
      ]);

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const purchasedIds = purchased.map(p => p.miniapp_id);

    const productList = products.map(p => {
      const enr = enrollments.find(e => e.product_id === p.id);
      return buildProductItem(p, progress, enr);
    });

    const miniappList = miniapps.map(m =>
      buildMiniappItem(m, purchasedIds)
    );

    const response: CabinetResponse = {
      user: normalizeUser(user),
      products: productList,
      miniapps: miniappList
    };

    res.json(response);

  } catch (err: any) {
    console.error("❌ CABINET ERROR:", err);
    res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
});

export default router;