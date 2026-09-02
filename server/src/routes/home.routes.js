import { Router } from "express";
import { getHomeData } from "../services/article.store.js";

const router = Router();

/**
 * 获取首页数据
 * GET /api/home
 */
router.get("/", async (req, res) => {
  try {
    const data = await getHomeData();
    res.json(data);
  } catch (error) {
    console.error("[Home] Error:", error);
    res.status(500).json({ error: "获取首页数据失败" });
  }
});

export default router;