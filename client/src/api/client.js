export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const ADMIN_TOKEN_KEY = "codeart_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function getJSON(url, withAuth = false) {
  const headers = {};
  if (withAuth) headers["x-admin-token"] = getAdminToken() || "";
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json();
}

async function sendJSON(url, method, body, withAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (withAuth) headers["x-admin-token"] = getAdminToken() || "";

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || res.statusText);
  }
  return res.json();
}

export const api = {
  /** 文章列表：{ page, pageSize, tag } → { list, total, page, pageSize, totalPages } */
  getArticles: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return getJSON(`/api/articles${query ? `?${query}` : ""}`);
  },

  /** 文章详情 → { slug, meta, contentHtml, toc, prev, next } */
  getArticle: (slug) => getJSON(`/api/articles/${encodeURIComponent(slug)}`),

  /** 首页数据 → { featured, latest, tags, total } */
  getHome: () => getJSON("/api/home"),

  /** 归档数据 → { list }（按日期降序全量 meta） */
  getArchive: () => getJSON("/api/archive"),

  // ===== 管理后台 =====

  /** 登录：{ password } → { token } */
  adminLogin: (password) => sendJSON("/api/admin/login", "POST", { password }),

  /** 全量文章 meta 列表 → { list }（需鉴权） */
  adminListArticles: () =>
    getJSON("/api/admin/articles", true).catch((err) => {
      if (err.status === 401) setAdminToken(null);
      throw err;
    }),

  /** 读取单篇原始 Markdown → { slug, fields, content }（需鉴权） */
  adminGetArticle: (slug) => getJSON(`/api/admin/articles/${encodeURIComponent(slug)}`, true),

  /** 新建文章：{ slug, ...fields, content } */
  adminCreateArticle: (payload) => sendJSON("/api/admin/articles", "POST", payload, true),

  /** 更新文章：{ ...fields, content } */
  adminUpdateArticle: (slug, payload) =>
    sendJSON(`/api/admin/articles/${encodeURIComponent(slug)}`, "PUT", payload, true),

  /** 删除文章 */
  adminDeleteArticle: (slug) =>
    sendJSON(`/api/admin/articles/${encodeURIComponent(slug)}`, "DELETE", undefined, true),

  /** Markdown 预览：{ content } → { html, toc } */
  adminPreview: (content) => sendJSON("/api/admin/preview", "POST", { content }, true),
};
