import { Router } from "express";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_DIR, ADMIN_PASSWORD, ADMIN_SECRET } from "../config.js";
import { getAllMetas, invalidateCache } from "../services/article.store.js";
import { renderMarkdown } from "../services/markdown.service.js";

const router = Router();

// slug 仅允许小写字母/数字/连字符，防止路径穿越
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// 登录态令牌：由密码 + 密钥派生，无过期（个人博客场景足够，密码泄露 = 令牌失效）
function expectedToken() {
  return crypto.createHash("sha256").update(`${ADMIN_PASSWORD}:${ADMIN_SECRET}`).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** 鉴权中间件：校验 x-admin-token 请求头 */
function requireAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || !safeEqual(String(token), expectedToken())) {
    return res.status(401).json({ error: "未登录或登录已失效" });
  }
  next();
}

/** slug → 文件绝对路径（含合法性校验） */
function articlePath(slug) {
  if (!SLUG_RE.test(slug)) {
    throw Object.assign(new Error("slug 不合法，仅允许小写字母、数字和连字符"), { status: 400 });
  }
  return path.join(CONTENT_DIR, `${slug}.md`);
}

/** 归一化日期：gray-matter 可能解析成 Date 对象 */
function normalizeDate(date) {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return date || "";
}

/** 组装 frontmatter 并序列化为完整 Markdown 文件内容 */
function buildFileContent({ title, date, tags, summary, featured }, content) {
  const data = {
    title: String(title || "").trim(),
    date: normalizeDate(date) || new Date().toISOString().slice(0, 10),
  };
  if (Array.isArray(tags) && tags.length > 0) data.tags = tags.map((t) => String(t).trim()).filter(Boolean);
  if (summary && String(summary).trim()) data.summary = String(summary).trim();
  if (featured) data.featured = true;
  return matter.stringify(content ?? "", data);
}

/**
 * 登录
 * POST /api/admin/login  { password } → { token }
 */
router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || !safeEqual(String(password), ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "密码错误" });
  }
  res.json({ token: expectedToken() });
});

// 以下接口全部需要登录
router.use(requireAuth);

/**
 * 文章列表（全量 meta）
 * GET /api/admin/articles
 */
router.get("/articles", async (req, res) => {
  try {
    res.json({ list: await getAllMetas() });
  } catch (error) {
    console.error("[Admin] List error:", error);
    res.status(500).json({ error: "获取文章列表失败" });
  }
});

/**
 * 读取单篇原始 Markdown（供编辑）
 * GET /api/admin/articles/:slug
 */
router.get("/articles/:slug", async (req, res) => {
  try {
    const filePath = articlePath(req.params.slug);
    let raw;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch {
      return res.status(404).json({ error: "文章不存在" });
    }

    const { data: frontmatter, content } = matter(raw);
    res.json({
      slug: req.params.slug,
      fields: {
        title: frontmatter.title || "",
        date: normalizeDate(frontmatter.date),
        tags: frontmatter.tags || [],
        summary: frontmatter.summary || "",
        featured: Boolean(frontmatter.featured),
      },
      content,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[Admin] Read error:", error);
    res.status(500).json({ error: "读取文章失败" });
  }
});

/**
 * 新建文章
 * POST /api/admin/articles  { slug, title, date, tags, summary, featured, content }
 */
router.post("/articles", async (req, res) => {
  try {
    const { slug, title, content } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "标题不能为空" });
    }
    const filePath = articlePath(String(slug || ""));

    try {
      await fs.access(filePath);
      return res.status(409).json({ error: "同名文章已存在，请换一个 slug" });
    } catch {
      // 不存在 → 继续创建
    }

    await fs.writeFile(filePath, buildFileContent(req.body, content), "utf-8");
    invalidateCache();
    res.status(201).json({ slug });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[Admin] Create error:", error);
    res.status(500).json({ error: "创建文章失败" });
  }
});

/**
 * 更新文章
 * PUT /api/admin/articles/:slug
 */
router.put("/articles/:slug", async (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "标题不能为空" });
    }
    const filePath = articlePath(req.params.slug);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "文章不存在" });
    }

    await fs.writeFile(filePath, buildFileContent(req.body, req.body?.content), "utf-8");
    invalidateCache();
    res.json({ slug: req.params.slug });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[Admin] Update error:", error);
    res.status(500).json({ error: "更新文章失败" });
  }
});

/**
 * 删除文章
 * DELETE /api/admin/articles/:slug
 */
router.delete("/articles/:slug", async (req, res) => {
  try {
    const filePath = articlePath(req.params.slug);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({ error: "文章不存在" });
      }
      // Windows 上文件被占用时会抛 EPERM/EBUSY，重试一次
      if (error.code === "EPERM" || error.code === "EBUSY") {
        await new Promise((r) => setTimeout(r, 120));
        try {
          await fs.unlink(filePath);
        } catch (retryError) {
          console.error(`[Admin] Delete retry failed (${retryError.code}):`, retryError);
          return res.status(500).json({ error: "文件被占用，删除失败，请稍后重试" });
        }
      } else {
        throw error;
      }
    }
    invalidateCache();
    res.json({ ok: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[Admin] Delete error:", error);
    res.status(500).json({ error: "删除文章失败" });
  }
});

/**
 * Markdown 实时预览（复用服务端渲染管线，含代码高亮）
 * POST /api/admin/preview  { content } → { html, toc }
 */
router.post("/preview", (req, res) => {
  try {
    const { html, toc } = renderMarkdown(String(req.body?.content ?? ""));
    res.json({ html, toc });
  } catch (error) {
    console.error("[Admin] Preview error:", error);
    res.status(500).json({ error: "预览渲染失败" });
  }
});

export default router;
