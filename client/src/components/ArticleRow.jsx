import { Link } from "react-router-dom";
import { formatDate, readingLabel } from "../utils/format.js";
import "./article-row.css";

/** 列表页杂志式行条目 */
export default function ArticleRow({ article }) {
  const { slug, title, summary, date, tags, readingTime } = article;

  return (
    <article className="row">
      <div className="row-meta">
        <time dateTime={date} className="row-date">
          {formatDate(date)}
        </time>
        <span className="row-reading">{readingLabel(readingTime)} 阅读</span>
      </div>

      <h2 className="row-title">
        <Link to={`/articles/${slug}`}>{title}</Link>
      </h2>

      <p className="row-summary">{summary}</p>

      <div className="row-tags">
        {tags.map((tag) => (
          <Link
            key={tag}
            to={`/articles?tag=${encodeURIComponent(tag)}`}
            className="row-tag"
          >
            #{tag}
          </Link>
        ))}
      </div>
    </article>
  );
}
