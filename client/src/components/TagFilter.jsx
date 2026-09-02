import { useSearchParams } from "react-router-dom";
import "./tag-filter.css";

/** 标签筛选条：全部 + 各标签，点击驱动 ?tag= */
export default function TagFilter({ tags }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("tag") || "";

  function selectTag(tag) {
    if (tag === active) return;
    const next = new URLSearchParams(searchParams);
    if (tag) {
      next.set("tag", tag);
    } else {
      next.delete("tag");
    }
    next.delete("page"); // 切换标签回到第一页
    setSearchParams(next);
  }

  return (
    <div className="tag-filter" role="group" aria-label="按标签筛选">
      <button
        type="button"
        className={`tag-chip${!active ? " active" : ""}`}
        onClick={() => selectTag("")}
      >
        全部
      </button>
      {tags.map((tag) => (
        <button
          key={tag.name}
          type="button"
          className={`tag-chip${active === tag.name ? " active" : ""}`}
          onClick={() => selectTag(tag.name)}
        >
          {tag.name}
          <span className="tag-count">{tag.count}</span>
        </button>
      ))}
    </div>
  );
}
