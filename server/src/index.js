import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { PORT } from "./config.js";
import articlesRoutes from "./routes/articles.routes.js";
import homeRoutes from "./routes/home.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// 中间件
app.use(cors()); // 开发时 Vite 代理，生产时 Express 静态服务
app.use(express.json());

// 路由
app.use("/api/articles", articlesRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/archive", archiveRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 生产静态服务 + SPA fallback：client/dist 存在即启用（无需 NODE_ENV）
const distPath = path.resolve(import.meta.dirname, "../../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(distPath, "index.html"));
    }
    next();
  });
}

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`[Server] Express server listening on port ${PORT}`);
});

// 导出 app 用于测试
export default app;