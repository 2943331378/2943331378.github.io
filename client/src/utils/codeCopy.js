import { copyText } from "./clipboard.js";

/**
 * 给容器挂"代码复制按钮"点击委托。
 * 按钮由服务端渲染进 HTML（markdown.service），这里只负责点击响应。
 * @param {HTMLElement} root - 正文容器（.prose 所在层）
 * @returns {() => void} 卸载函数
 */
export function attachCodeCopy(root) {
  async function onClick(e) {
    const btn = e.target.closest(".code-copy-btn");
    if (!btn) return;

    const pre = btn.closest("pre");
    const text = pre?.querySelector("code")?.innerText ?? pre?.innerText ?? "";
    const ok = await copyText(text).catch(() => false);

    btn.textContent = ok ? "已复制 ✓" : "复制失败";
    btn.classList.toggle("is-copied", ok);
    btn.classList.toggle("is-failed", !ok);

    setTimeout(() => {
      btn.textContent = "复制";
      btn.classList.remove("is-copied", "is-failed");
    }, 1600);
  }

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
