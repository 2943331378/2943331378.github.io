import path from "node:path";

export const PORT = process.env.PORT || 3001;
export const CONTENT_DIR = path.resolve(import.meta.dirname, "../../content/articles");
export const PAGE_SIZE = 9;
export const MAX_PAGE_SIZE = 50;
export const TAGS_LIMIT = 50;

// 管理后台：生产环境务必通过环境变量设置 ADMIN_PASSWORD
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "codeart-admin-secret";