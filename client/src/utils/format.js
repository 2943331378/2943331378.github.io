/** "2026-08-10T00:00:00.000Z" → "2026年8月10日" */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 阅读时长：n 分钟 */
export function readingLabel(minutes) {
  return `${minutes} 分钟`;
}
