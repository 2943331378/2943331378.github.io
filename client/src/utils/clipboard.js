/**
 * 复制文本到剪贴板（带降级方案）
 * Clipboard API 仅在安全上下文（HTTPS / localhost）可用；
 * 非安全上下文降级为隐藏 textarea + execCommand('copy')
 */
export async function copyText(text) {
  // 首选：Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 权限拒绝或上下文异常 → 继续尝试降级方案
    }
  }

  // 降级：execCommand（已废弃但在非安全上下文下仍广泛可用）
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-9999px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
