import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { PROFILE } from "../data/profile.js";
import ArticleCard from "../components/ArticleCard.jsx";
import { LoadingBlock, ErrorBlock } from "../components/PageState.jsx";
import { formatDate, readingLabel } from "../utils/format.js";
import "./home.css";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getHome()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = `CodeArt · ${PROFILE.title}`;
  }, []);

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">{PROFILE.kicker}</p>
          <h1 className="hero-title">{PROFILE.heroTitle}</h1>
          <p className="hero-sub">{PROFILE.heroSub}</p>
          <div className="hero-cta">
            <Link to="/articles" className="btn btn-primary">
              阅读文章
            </Link>
            <a href="#latest" className="btn btn-ghost">
              最新发布 ↓
            </a>
          </div>
        </div>
      </section>

      {error ? (
        <div className="container">
          <ErrorBlock message="首页数据加载失败" onRetry={() => window.location.reload()} />
        </div>
      ) : !data ? (
        <LoadingBlock label="正在加载…" />
      ) : (
        <>
          {/* ===== 精选文章 ===== */}
          {data.featured && (
            <section className="section featured-section">
              <div className="container">
                <div className="featured-card">
                  <Link to={`/articles/${data.featured.slug}`} className="featured-link" aria-hidden="true" />
                  <div className="featured-body">
                    <p className="eyebrow featured-kicker">· Featured ·</p>
                    <h2 className="featured-title">{data.featured.title}</h2>
                    <p className="featured-summary">{data.featured.summary}</p>
                    <div className="featured-meta">
                      <span>{formatDate(data.featured.date)}</span>
                      <span className="meta-sep" aria-hidden="true" />
                      <span>{readingLabel(data.featured.readingTime)} 阅读</span>
                      <span className="featured-more">阅读全文 →</span>
                    </div>
                  </div>
                  <div className="featured-stamp" aria-hidden="true">
                    {data.featured.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="featured-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== 最新文章 ===== */}
          <section className="section latest-section" id="latest">
            <div className="container">
              <div className="section-head latest-head">
                <div>
                  <p className="eyebrow">Latest</p>
                  <h2 className="page-title">最新文章</h2>
                </div>
                <Link to="/articles" className="latest-all">
                  查看全部 →
                </Link>
              </div>

              {data.latest.length === 0 ? (
                <p className="home-empty">还没有文章，敬请期待。</p>
              ) : (
                <div className="latest-grid">
                  {data.latest.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ===== 标签 + 统计 ===== */}
          {data.tags.length > 0 && (
            <section className="section tags-section">
              <div className="container tags-inner">
                <div className="tags-cloud">
                  {data.tags.map((tag) => (
                    <Link
                      key={tag.name}
                      to={`/articles?tag=${encodeURIComponent(tag.name)}`}
                      className="cloud-tag"
                    >
                      {tag.name}
                      <span className="cloud-count">{tag.count}</span>
                    </Link>
                  ))}
                </div>

                <dl className="stats">
                  <div className="stat">
                    <dt>文章</dt>
                    <dd>{data.total}</dd>
                  </div>
                  <div className="stat">
                    <dt>标签</dt>
                    <dd>{data.tags.length}</dd>
                  </div>
                </dl>
              </div>
            </section>
          )}

          {/* ===== 关于 ===== */}
          <section className="section about-section">
            <div className="container about-inner">
              <p className="eyebrow">About</p>
              <h2 className="page-title about-title">关于我</h2>
              <p className="about-text">{PROFILE.about}</p>
              <ul className="about-skills">
                {PROFILE.skills.map((skill) => (
                  <li key={skill} className="about-skill">{skill}</li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  );
}
