import { Router } from "express";
import { getAllMetas } from "../services/article.store.js";

const router = Router();

/**
 * 归档数据：全量文章 meta，按日期降序（前端按年份分组）
 * GET /api/archive
 */
router.get("/", async (req, res) => {
  try {
    res.json({ list: await getAllMetas() });
  } catch (error) {
    console.error("[Archive] Error:", error);
    res.status(500).json({ error: "获取归档数据失败" });
  }
});

export default router;
