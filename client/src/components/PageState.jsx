import "./page-state.css";

/** 数据加载骨架 */
export function LoadingBlock({ label = "加载中…" }) {
  return (
    <div className="page-state" role="status">
      <div className="skeleton loading-bar" />
      <p className="page-state-text">{label}</p>
    </div>
  );
}

/** 加载失败提示 */
export function ErrorBlock({ message = "加载失败，请稍后重试", onRetry }) {
  return (
    <div className="page-state" role="alert">
      <p className="page-state-text page-state-error">⚠ {message}</p>
      {onRetry && (
        <button type="button" className="retry-btn" onClick={onRetry}>
          重新加载
        </button>
      )}
    </div>
  );
}
