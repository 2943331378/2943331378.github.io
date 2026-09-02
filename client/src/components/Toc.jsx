import { useState, useEffect } from "react";
import "./toc.css";

/**
 * 文章目录（右侧 sticky）
 * items: [{ id, text, level }]
 * activeId 由父组件通过 IntersectionObserver 计算后传入
 */
export default function Toc({ items, activeId }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="toc" aria-label="文章目录">
      <p className="toc-title">目录</p>
      <ol className="toc-list">
        {items.map((item) => (
          <li key={item.id} className={`toc-item lv-${item.level}`}>
            <a
              href={`#${item.id}`}
              className={`toc-link${activeId === item.id ? " active" : ""}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** 监听 h2/h3 滚动位置，返回当前活跃的标题 id */
export function useActiveHeading(containerRef, tocItems) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !tocItems.length) return;

    const elements = tocItems
      .map((item) => root.querySelector(`#${CSS.escape(item.id)}`))
      .filter(Boolean);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 只关心正在进入视口的条目（从上方进入）
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef, tocItems]);

  return activeId;
}
