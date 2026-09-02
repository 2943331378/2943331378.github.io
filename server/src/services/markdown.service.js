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
  const html = md.render(src, env);
  return { html, toc: env.toc || [] };
}