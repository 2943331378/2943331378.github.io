import { useEffect, useState } from "react";

const THEME_KEY = "codeart_theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** 主题切换按钮：亮 / 暗，持久化到 localStorage */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  }

  // 同步其他标签页的主题切换
  useEffect(() => {
    function onStorage(e) {
      if (e.key === THEME_KEY && e.newValue) {
        if (e.newValue === "dark") document.documentElement.dataset.theme = "dark";
        else delete document.documentElement.dataset.theme;
        setTheme(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "切换到亮色" : "切换到暗色"}
      aria-label={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
