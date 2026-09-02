import { Link } from "react-router-dom";
import { formatDate, readingLabel } from "../utils/format.js";
import "./article-card.css";

/** 首页最新文章网格卡片 */
export default function ArticleCard({ article }) {
  const { slug, title, summary, date, tags, readingTime } = article;

  return (
    <article className="card">
      <div className="card-tags">
        {tags.slice(0, 2).map((tag) => (
          <Link key={tag} to={`/articles?tag=${encodeURIComponent(tag)}`} className="card-tag">
            {tag}
          </Link>
        ))}
      </div>

      <h3 className="card-title">
        <Link to={`/articles/${slug}`}>{title}</Link>
      </h3>

      <p className="card-summary">{summary}</p>

      <div className="card-meta">
        <time dateTime={date}>{formatDate(date)}</time>
        <span className="meta-dot" aria-hidden="true" />
        <span>{readingLabel(readingTime)}</span>
        <span className="card-more" aria-hidden="true">
          阅读全文 →
        </span>
      </div>
    </article>
  );
}
