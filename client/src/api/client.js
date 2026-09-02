export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
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
};
