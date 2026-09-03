import { Router } from "express";
import { getArticles, getArticle } from "../services/article.store.js";

const router = Router();

/**
 * 获取文章列表
 * GET /api/articles?page=1&pageSize=9&tag=Java&q=索引
 */
router.get("/", async (req, res) => {
  try {
    const { page, pageSize, tag, q } = req.query;
    const params = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? Math.min(parseInt(pageSize, 10), 50) : 9,
      tag: tag || undefined,
      q: q || undefined,
    };

    const data = await getArticles(params);
    res.json(data);
  } catch (error) {
    console.error("[Articles] Error:", error);
    res.status(500).json({ error: "获取文章列表失败" });
  }
});

/**
 * 获取单篇文章详情
 * GET /api/articles/:slug
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await getArticle(slug);

    if (!article) {
      return res.status(404).json({ error: "文章不存在" });
    }

    res.json(article);
  } catch (error) {
    console.error("[Article] Error:", error);
    res.status(500).json({ error: "获取文章详情失败" });
  }
});

export default router;