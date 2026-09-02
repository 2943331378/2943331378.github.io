import path from "node:path";

export const PORT = process.env.PORT || 3001;
export const CONTENT_DIR = path.resolve(import.meta.dirname, "../../content/articles");
export const PAGE_SIZE = 9;
export const MAX_PAGE_SIZE = 50;
export const TAGS_LIMIT = 50;