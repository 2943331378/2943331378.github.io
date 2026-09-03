import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { LoadingBlock, ErrorBlock } from "../components/PageState.jsx";
import { formatDate } from "../utils/format.js";
import "./archive.css";

export default function ArchivePage() {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "归档 · CodeArt";
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getArchive()
      .then((data) => {
        if (!cancelled) setList(data.list);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 按年份分组（列表已是日期降序）
  const groups = list
    ? Object.entries(
        list.reduce((acc, article) => {
          const year = new Date(article.date).getFullYear();
          (acc[year] = acc[year] || []).push(article);
          return acc;
        }, {})
      ).sort(([a], [b]) => b - a)
    : [];

  return (
    <div className="container archive-page">
      <header className="archive-head">
        <p className="eyebrow">Archive</p>
        <h1 className="page-title">归档</h1>
        <p className="page-sub">{list ? `共 ${list.length} 篇文章` : "载入中…"}</p>
      </header>

      {error ? (
        <ErrorBlock message="归档加载失败" onRetry={() => window.location.reload()} />
      ) : !list ? (
        <LoadingBlock label="正在加载归档…" />
      ) : list.length === 0 ? (
        <p className="archive-empty">还没有文章。</p>
      ) : (
        <div className="archive-groups">
          {groups.map(([year, articles]) => (
            <section key={year} className="archive-group">
              <h2 className="archive-year">
                {year}
                <span className="archive-year-count">{articles.length}</span>
              </h2>
              <ul className="archive-list">
                {articles.map((article) => (
                  <li key={article.slug} className="archive-item">
                    <Link to={`/articles/${article.slug}`} className="archive-link">
                      <time className="archive-date" dateTime={article.date}>
                        {formatDate(article.date).replace(/^\d{4}年/, "")}
                      </time>
                      <span className="archive-item-title">
                        {article.featured && <span className="archive-star">★</span>}
                        {article.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
