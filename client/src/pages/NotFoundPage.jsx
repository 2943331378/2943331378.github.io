import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./not-found.css";

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "页面不存在 · CodeArt";
  }, []);

  return (
    <div className="container not-found">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 className="not-found-title">页面走丢了</h1>
      <p className="not-found-text">你访问的页面不存在，或已被移动到别处。</p>
      <div className="not-found-cta">
        <Link to="/" className="btn btn-primary">
          回到首页
        </Link>
        <Link to="/articles" className="btn btn-ghost">
          浏览文章
        </Link>
      </div>
    </div>
  );
}
