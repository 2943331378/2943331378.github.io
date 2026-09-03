import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import ArticleRow from "../components/ArticleRow.jsx";
import TagFilter from "../components/TagFilter.jsx";
import Pagination from "../components/Pagination.jsx";
import { LoadingBlock, ErrorBlock } from "../components/PageState.jsx";
import "./article-list.css";

const PAGE_SIZE = 9;

export default function ArticleListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // 搜索框本地输入态 + 防抖同步到 URL
  const [keyword, setKeyword] = useState(q);
  const debounceRef = useRef(null);

  // URL 中的 q 变化（如点标签跳转）时回填输入框
  useEffect(() => setKeyword(q), [q]);

  function onKeywordChange(value) {
    setKeyword(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams();
      if (tag) next.set("tag", tag);
      if (value.trim()) next.set("q", value.trim());
      setSearchParams(next); // 改搜索词时重置回第 1 页
    }, 400);
  }

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    api
      .getArticles({ page, pageSize: PAGE_SIZE, tag, q })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [tag, page, q]);

  // 页签标题
  useEffect(() => {
    document.title = q
      ? `「${q}」的搜索结果 · CodeArt`
      : tag
        ? `${tag} · 文章列表 · CodeArt`
        : "全部文章 · CodeArt";
  }, [tag, q]);

  return (
    <div className="container list-page">
      <header className="list-head">
        <p className="eyebrow">Articles</p>
        <h1 className="page-title">{q ? `搜索「${q}」` : tag ? `#${tag}` : "全部文章"}</h1>
        <p className="page-sub">
          {data ? `共 ${data.total} 篇文章` : "载入中…"}
        </p>
      </header>

      <div className="list-toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            className="search-input"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索标题、摘要或标签…"
            aria-label="搜索文章"
          />
          {keyword && (
            <button className="search-clear" onClick={() => onKeywordChange("")} aria-label="清空搜索">
              ✕
            </button>
          )}
        </div>
        {data && data.tags.length > 0 && <TagFilter tags={data.tags} />}
      </div>

      {error ? (
        <ErrorBlock
          message="文章加载失败"
          onRetry={() => window.location.reload()}
        />
      ) : !data ? (
        <LoadingBlock label="正在加载文章…" />
      ) : data.list.length === 0 ? (
        <div className="list-empty">
          <p>{q ? `没有找到与「${q}」相关的文章。` : "这个标签下还没有文章。"}</p>
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
