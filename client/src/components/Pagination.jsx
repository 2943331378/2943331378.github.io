import { useSearchParams } from "react-router-dom";
import "./pagination.css";

/** 分页：上一页 / 页码 / 下一页，保留 tag 参数 */
export default function Pagination({ page, totalPages }) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(target) {
    if (target < 1 || target > totalPages || target === page) return;
    const next = new URLSearchParams(searchParams);
    if (target === 1) {
      next.delete("page");
    } else {
      next.set("page", String(target));
    }
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 页码窗口：当前页附近最多 5 个
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="pagination" aria-label="分页">
      <button
        type="button"
        className="page-btn"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        ← 上一页
      </button>

      <div className="page-numbers">
        {start > 1 && (
          <>
            <button type="button" className={`page-num${page === 1 ? " current" : ""}`} onClick={() => goTo(1)}>
              1
            </button>
            {start > 2 && <span className="page-ellipsis">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`page-num${p === page ? " current" : ""}`}
            onClick={() => goTo(p)}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="page-ellipsis">…</span>}
            <button type="button" className="page-num" onClick={() => goTo(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        className="page-btn"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
      >
        下一页 →
      </button>
    </nav>
  );
}
