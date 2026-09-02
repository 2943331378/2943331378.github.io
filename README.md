# CodeArt · 宁悦童的技术博客

React + Node.js 全栈个人博客，前后端分离，杂志风设计。

## 技术栈

- **前端**：Vite + React 19 + React Router 7，手写 CSS（设计 tokens）
- **后端**：Express 5，markdown-it + highlight.js 服务端渲染 Markdown
- **内容**：`content/articles/` 下的 Markdown 文件（YAML frontmatter），无需数据库

## 快速开始

```bash
npm install     # 根目录一次安装 client + server 所有依赖
npm run dev     # 并行启动 API(3001) 与前端(5173)
```

打开 http://localhost:5173

## 生产运行

```bash
npm run build   # 构建前端到 client/dist
npm start       # Express 单端口 3001：API + 静态资源 + SPA fallback
```

打开 http://localhost:3001

## 如何写文章

在 `content/articles/` 下新建 `英文slug.md`（文件名即文章 URL）：

```markdown
---
title: 文章标题
date: 2026-09-02
tags: [Java, 并发编程]
summary: 一两句话摘要，显示在列表卡片上。
featured: false
---

正文 Markdown，支持代码块高亮（java / sql / yaml …）。
```

保存后刷新页面即可生效，无需重启服务。
