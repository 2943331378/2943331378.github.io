import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown } from "./markdown.service.js";
import { CONTENT_DIR, PAGE_SIZE, MAX_PAGE_SIZE, TAGS_LIMIT } from "../config.js";

// 缓存：slug → {meta, contentHtml, toc}；dirty 标记内容目录是否变化
const cache = new Map();
let dirty = true;

// 监听文件变化，命中后标记脏，下次请求全量重扫
async function watchContentDir() {
  try {
    const watcher = fs.watch(CONTENT_DIR, { recursive: true });
    for await (const { eventType, filename } of watcher) {
      if (filename && filename.endsWith(".md")) {
        console.log(`[Cache] Invalidated by file change: ${filename}`);
        dirty = true;
      }
    }
  } catch (error) {
    console.error("[Cache] Watch error:", error);
  }
}
watchContentDir();

// 手动标记缓存失效（管理后台写文件后调用，兜底 fs.watch 漏事件）
export function invalidateCache() {
  dirty = true;
}

/**
 * 扫描并解析所有文章
 * @returns {Promise<Array<{slug: string, meta: any, contentHtml: string, toc: Array}>}
 */
async function scanArticles() {
  // 缓存干净且非空：直接返回，不再读盘
  if (!dirty && cache.size > 0) {
    return Array.from(cache.values());
  }

  try {
    const files = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
    const articles = [];
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".md")) continue;

      const slug = path.basename(file.name, ".md");
      const filePath = path.join(CONTENT_DIR, file.name);

      try {
        const content = await fs.readFile(filePath, "utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        // 验证必需字段
        if (!frontmatter.title || !frontmatter.date) {
          console.warn(`[Article] Missing required fields in ${slug}: title=${!!frontmatter.title}, date=${!!frontmatter.date}`);
          continue;
        }

        const { html, toc } = renderMarkdown(markdown);

        articles.push({
          slug,
          meta: {
            slug,
            title: frontmatter.title,
            date: frontmatter.date,
            tags: frontmatter.tags || [],
            summary: frontmatter.summary || "",
            readingTime: calculateReadingTime(markdown),
            featured: frontmatter.featured || false,
          },
          contentHtml: html,
          toc,
        });
      } catch (error) {
        console.error(`[Article] Failed to parse ${slug}:`, error);
      }
    }

    // 按日期降序排序
    articles.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));

    // 更新缓存
    cache.clear();
    articles.forEach(article => {
      cache.set(article.slug, article);
    });
    dirty = false;

    return articles;
  } catch (error) {
    console.error("[Article Store] Scan failed:", error);
    return Array.from(cache.values()); // 返回缓存（即使扫描失败）
  }
}

/**
 * 计算阅读时间（分钟）
 * @param {string} markdown - Markdown 内容
 * @returns {number}
 */
function calculateReadingTime(markdown) {
  const cjkChars = (markdown.match(/[一-龥]/g) || []).length;
  const latinWords = (markdown.match(/[a-zA-Z]+/g) || []).length;
  return Math.max(1, Math.ceil(cjkChars / 400 + latinWords / 200));
}

/**
 * 统计全部文章标签
 * @param {Array} articles
 * @returns {Array<{name: string, count: number}>}
 */
function buildTagCounts(articles) {
  const tagCounts = {};
  articles.forEach((article) => {
    article.meta.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TAGS_LIMIT)
    .map(([name, count]) => ({ name, count }));
}

/**
 * 获取文章列表（支持分页、标签过滤、关键词搜索）
 * @param {Object} params - {page, pageSize, tag, q}
 * @returns {Promise<Object>} - {list, total, page, pageSize, totalPages, tags, q}
 */
export async function getArticles(params = {}) {
  const { page = 1, pageSize = PAGE_SIZE, tag, q } = params;
  const articles = await scanArticles();

  const tags = buildTagCounts(articles); // 全量标签（不受过滤/分页影响，供筛选栏常驻）

  let filtered = articles;
  if (tag) {
    filtered = filtered.filter((article) => article.meta.tags.includes(tag));
  }
  if (q && String(q).trim()) {
    const kw = String(q).trim().toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.meta.title.toLowerCase().includes(kw) ||
        (a.meta.summary || "").toLowerCase().includes(kw) ||
        a.meta.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const list = filtered.slice(startIndex, endIndex).map((article) => article.meta);

  return { list, total, page, pageSize, totalPages, tags, q: q || null };
}

/**
 * 获取单篇文章详情
 * @param {string} slug - 文章 slug
 * @returns {Promise<{meta, html, toc, prev, next}>}
 */
export async function getArticle(slug) {
  const articles = await scanArticles();
  const article = articles.find(a => a.slug === slug);

  if (!article) {
    return null;
  }

  // 计算 prev/next
  const currentIndex = articles.findIndex(a => a.slug === slug);
  const prev = currentIndex > 0 ? articles[currentIndex - 1].meta : null;
  const next = currentIndex < articles.length - 1 ? articles[currentIndex + 1].meta : null;

  return {
    ...article,
    prev,
    next,
  };
}

/**
 * 获取全部文章 meta（管理后台用，不分页）
 * @returns {Promise<Array>} 按日期降序的 meta 列表
 */
export async function getAllMetas() {
  const articles = await scanArticles();
  return articles.map((a) => a.meta);
}

/**
 * 获取首页数据（featured + latest）
 * @returns {Promise<Object>}
 */
export async function getHomeData() {
  const articles = await scanArticles();

  const featured = articles.find(a => a.meta.featured) || null;
  const latest = articles.slice(0, 3).map(a => a.meta);

  return {
    featured: featured ? featured.meta : null,
    latest,
    tags: buildTagCounts(articles),
    total: articles.length,
  };
}