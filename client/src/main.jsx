import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// 自托管衬线字体（标题用）
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
// 代码高亮主题（github 亮色 + 暗色 token 覆盖）
import "highlight.js/styles/github.css";
import "./styles/hljs-dark.css";

// 全局样式
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/markdown.css";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
