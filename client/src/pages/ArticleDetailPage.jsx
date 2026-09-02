import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import Toc, { useActiveHeading } from "../components/Toc.jsx";
import { LoadingBlock, ErrorBlock } from "../components/PageState.jsx";
import { formatDate, readingLabel } from "../utils/format.js";
import "./article-detail.css";

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);
  const bodyRef = useRef(null);

  // 拉取文章
  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setError(null);

    api
      .getArticle(slug)
      .then((result) => {
        if (!cancelled) setArticle(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 页签标题
  useEffect(() => {
    if (article) {
      document.title = `${article.meta.title} · CodeArt`;
    }
  }, [article]);

  const activeId = useActiveHeading(bodyRef, article?.toc ?? []);

  if (error) {
    const is404 = error.status === 404;
    return (
      <div className="container detail-page">
        <ErrorBlock
          message={is404 ? "文章不存在或已被移除" : "文章加载失败"}
          onRetry={() => (is404 ? undefined : window.location.reload())}
        />
        {is404 && (
          <p className="detail-back">
            <Link to="/articles">← 返回文章列表</Link>
          </p>
        )}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container detail-page">
        <LoadingBlock label="正在加载文章…" />
      </div>
    );
  }

  const { meta, contentHtml, toc, prev, next } = article;

  return (
    <div className="detail-page">
      {/* 文章头 */}
      <header className="detail-head">
        <div className="container detail-head-inner">
          {meta.tags.length > 0 && (
            <div className="detail-tags">
              {meta.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="detail-tag"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <h1 className="detail-title">{meta.title}</h1>

          {meta.summary && <p className="detail-lede">{meta.summary}</p>}

          <div className="detail-meta">
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            <span className="meta-sep" aria-hidden="true" />
            <span>{readingLabel(meta.readingTime)} 阅读</span>
          </div>
        </div>
      </header>

      {/* 正文 + 目录 */}
      <div className="container">
        <div className="detail-body">
          <div ref={bodyRef} className="detail-column">
            <article
              className="prose"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>

          <aside className="detail-aside" aria-label="目录侧栏">
            <Toc items={toc} activeId={activeId} />
          </aside>
        </div>

        {/* 上一篇 / 下一篇 */}
        <nav className="detail-pager" aria-label="文章导航">
          {prev ? (
            <Link to={`/articles/${prev.slug}`} className="pager-card pager-prev">
              <span className="pager-label">← 上一篇</span>
              <span className="pager-title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}

          {next ? (
            <Link to={`/articles/${next.slug}`} className="pager-card pager-next">
              <span className="pager-label">下一篇 →</span>
              <span className="pager-title">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}
