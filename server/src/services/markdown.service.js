import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import GithubSlugger from "github-slugger";

const slugger = new GithubSlugger();

// markdown-it 实例配置
const md = new MarkdownIt({
  html: false, // 不允许内嵌 HTML，防止 XSS
  linkify: true, // 自动识别链接
  breaks: false, // 不自动转换换行符，保持 Markdown 原始格式
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (e) {
        console.warn(`Highlight.js failed for language: ${lang}`, e);
      }
    }
    return `<pre class="hljs"><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

// 自定义 fence：```embed 渲染成站内 iframe。只接受 / 开头的站内路径，避免嵌任意外链
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info.trim();
  if (!info.startsWith("embed")) {
    return defaultFence(tokens, idx, options, env, self);
  }

  const [srcLine = "", titleLine = ""] = token.content.trim().split("\n");
  const [infoSrc = "", ...infoTitle] = info.slice("embed".length).trim().split(/\s+/);
  const src = infoSrc || srcLine.trim();
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(src)) {
    return '<p class="embed-invalid">嵌入地址必须是以 / 开头的站内路径</p>\n';
  }

  const title = md.utils.escapeHtml(
    infoTitle.join(" ").trim() || titleLine.trim() || "嵌入式演示"
  );
  return (
    '<div class="embed-frame">' +
    `<div class="embed-bar"><span>${title}</span>` +
    `<a href="${src}" target="_blank" rel="noopener noreferrer">全屏打开 ↗</a></div>` +
    `<iframe src="${src}" title="${title}" loading="lazy" allow="fullscreen"></iframe>` +
    "</div>\n"
  );
};

// 自定义 heading 插件：在 token 流上注入 id 并收集 TOC（core rule，不改 renderer）
md.core.ruler.after("inline", "heading-ids-and-toc", (state) => {
  const toc = [];
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "heading_open") continue;
    if (token.tag !== "h2" && token.tag !== "h3") continue;

    const inline = tokens[i + 1];
    const text =
      inline && inline.type === "inline" && inline.children && inline.children.length
        ? inline.children
            .filter((c) => c.type === "text" || c.type === "code_inline")
            .map((c) => c.content)
            .join("")
        : inline?.content || "";

    const id = slugger.slug(text);
    token.attrSet("id", id);
    toc.push({
      id,
      text,
      level: token.tag === "h2" ? 2 : 3,
    });
  }

  state.env.toc = toc;
});

/**
 * 渲染 Markdown 并提取 TOC
 * @param {string} src - Markdown 源文本
 * @returns {{html: string, toc: Array<{id: string, text: string, level: number}>}}
 */
export function renderMarkdown(src) {
  slugger.reset(); // 每次渲染重置 slugger，避免跨文档 id 冲突
  const env = {};
  let html = md.render(src, env);
  // 复制按钮写进 HTML 本身（React 拥有的 innerHTML 的一部分，重渲染不丢失）
  html = html.replaceAll(
    "</pre>",
    '<button class="code-copy-btn" type="button">复制</button></pre>'
  );
  return { html, toc: env.toc || [] };
}