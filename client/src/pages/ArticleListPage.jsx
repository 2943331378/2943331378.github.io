import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import ArticleRow from "../components/ArticleRow.jsx";
import TagFilter from "../components/TagFilter.jsx";
import Pagination from "../components/Pagination.jsx";
import { LoadingBlock, ErrorBlock } from "../components/PageState.jsx";
import "./article-list.css";

const PAGE_SIZE = 9;

export default function ArticleListPage() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    api
      .getArticles({ page, pageSize: PAGE_SIZE, tag })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [tag, page]);

  // 页签标题
  useEffect(() => {
    document.title = tag
      ? `${tag} · 文章列表 · CodeArt`
      : "全部文章 · CodeArt";
  }, [tag]);

  return (
    <div className="container list-page">
      <header className="list-head">
        <p className="eyebrow">Articles</p>
        <h1 className="page-title">{tag ? `#${tag}` : "全部文章"}</h1>
        <p className="page-sub">
          {data ? `共 ${data.total} 篇文章` : "载入中…"}
        </p>
      </header>

      {data && data.tags.length > 0 && (
        <div className="list-filter">
          <TagFilter tags={data.tags} />
        </div>
      )}

      {error ? (
        <ErrorBlock
          message="文章加载失败"
          onRetry={() => window.location.reload()}
        />
      ) : !data ? (
        <LoadingBlock label="正在加载文章…" />
      ) : data.list.length === 0 ? (
        <div className="list-empty">
          <p>这个标签下还没有文章。</p>
        </div>
      ) : (
        <>
          <div className="list-rows">
            {data.list.map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} />
        </>
      )}
    </div>
  );
}
