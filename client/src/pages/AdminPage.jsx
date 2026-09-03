import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getAdminToken, setAdminToken } from "../api/client.js";
import { attachCodeCopy } from "../utils/codeCopy.js";
import { formatDate } from "../utils/format.js";
import "./admin.css";

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  slug: "",
  title: "",
  date: todayStr(),
  tags: "",
  summary: "",
  featured: false,
  content: "",
});

export default function AdminPage() {
  const [authed, setAuthed] = useState(Boolean(getAdminToken()));
  const [articles, setArticles] = useState(null);
  const [listError, setListError] = useState(null);

  // 编辑状态：editing = null(新建) | { slug, isNew }
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "err", text }

  // 预览
  const [previewHtml, setPreviewHtml] = useState("");
  const previewTimer = useRef(null);
  const previewRef = useRef(null);

  // 预览面板复制按钮（服务端渲染进 HTML，这里挂点击委托）
  useEffect(() => {
    if (!authed || !previewRef.current) return;
    return attachCodeCopy(previewRef.current);
  }, [authed]);

  useEffect(() => {
    document.title = "写作台 · CodeArt";
  }, []);

  const loadList = useCallback(() => {
    setListError(null);
    api
      .adminListArticles()
      .then((data) => setArticles(data.list))
      .catch((err) => {
        if (err.status === 401) {
          setAuthed(false);
          setAdminToken(null);
        } else {
          setListError(err.message);
        }
      });
  }, []);

  useEffect(() => {
    if (authed) loadList();
  }, [authed, loadList]);

  // 防抖预览
  useEffect(() => {
    if (!authed) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      api
        .adminPreview(form.content)
        .then((data) => setPreviewHtml(data.html))
        .catch(() => setPreviewHtml(""));
    }, 400);
    return () => clearTimeout(previewTimer.current);
  }, [form.content, authed]);

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  if (!authed) return <LoginView onSuccess={() => setAuthed(true)} />;

  // ===== 编辑器操作 =====

  function startNew() {
    setEditing(null);
    setForm(emptyForm());
  }

  async function openArticle(slug) {
    try {
      const data = await api.adminGetArticle(slug);
      setEditing({ slug, isNew: false });
      setForm({
        slug,
        title: data.fields.title,
        date: data.fields.date,
        tags: data.fields.tags.join(", "),
        summary: data.fields.summary,
        featured: data.fields.featured,
        content: data.content,
      });
    } catch (err) {
      flash("err", err.message);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) return flash("err", "标题不能为空");
    if (!editing && !/^[a-z0-9][a-z0-9-]*$/.test(form.slug))
      return flash("err", "slug 仅允许小写字母、数字和连字符");

    setSaving(true);
    const payload = {
      slug: form.slug,
      title: form.title,
      date: form.date,
      tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      summary: form.summary,
      featured: form.featured,
      content: form.content,
    };
    try {
      if (editing) {
        await api.adminUpdateArticle(editing.slug, payload);
        flash("ok", "已保存");
      } else {
        await api.adminCreateArticle(payload);
        flash("ok", "已发布");
        setEditing({ slug: form.slug, isNew: false });
      }
      loadList();
    } catch (err) {
      flash("err", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug) {
    if (!window.confirm(`确定删除《${slug}》吗？此操作不可恢复。`)) return;
    try {
      await api.adminDeleteArticle(slug);
      if (editing?.slug === slug) {
        setEditing(null);
        setForm(emptyForm());
      }
      flash("ok", "已删除");
      loadList();
    } catch (err) {
      flash("err", err.message);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // ===== 渲染 =====

  return (
    <div className="container admin-page">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="admin-title">写作台</h1>
        </div>
        <div className="admin-head-actions">
          <button className="btn btn-primary" onClick={startNew}>
            ＋ 新建文章
          </button>
          <Link to="/" className="btn btn-ghost">
            返回站点
          </Link>
        </div>
      </header>

      {message && (
        <p className={`admin-toast ${message.type === "ok" ? "is-ok" : "is-err"}`}>{message.text}</p>
      )}

      <div className="admin-layout">
        {/* ===== 左侧：文章列表 ===== */}
        <aside className="admin-sidebar">
          <h2 className="admin-side-title">全部文章（{articles ? articles.length : "…"}）</h2>
          {listError && <p className="admin-list-error">{listError}</p>}
          {!articles && !listError && <p className="admin-loading">加载中…</p>}
          {articles && articles.length === 0 && <p className="admin-loading">还没有文章，点右上角新建。</p>}
          {articles && (
            <ul className="admin-list">
              {articles.map((a) => (
                <li
                  key={a.slug}
                  className={`admin-item${editing?.slug === a.slug ? " is-active" : ""}`}
                >
                  <button className="admin-item-btn" onClick={() => openArticle(a.slug)}>
                    <span className="admin-item-title">
                      {a.featured && <span className="admin-star" title="精选">★</span>}
                      {a.title}
                    </span>
                    <span className="admin-item-meta">
                      {formatDate(a.date)} · {a.slug}
                    </span>
                  </button>
                  <button
                    className="admin-item-del"
                    title="删除"
                    onClick={() => handleDelete(a.slug)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ===== 右侧：编辑器 ===== */}
        <section className="admin-editor">
          <div className="admin-fields">
            <div className="admin-field-row">
              <label className="admin-field admin-field-grow">
                <span>标题</span>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="文章标题"
                />
              </label>
              <label className="admin-field">
                <span>日期</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </label>
            </div>

            <div className="admin-field-row">
              <label className="admin-field admin-field-grow">
                <span>Slug（URL）</span>
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value.toLowerCase())}
                  placeholder="my-new-post"
                  disabled={Boolean(editing)}
                />
              </label>
              <label className="admin-field admin-field-grow">
                <span>标签（逗号分隔）</span>
                <input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="Java, Spring Boot"
                />
              </label>
            </div>

            <label className="admin-field">
              <span>摘要（显示在列表卡片上）</span>
              <input
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="一两句话摘要"
              />
            </label>

            <label className="admin-featured">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              设为精选（首页大卡片，多篇时只显示最新一篇）
            </label>
          </div>

          <div className="admin-workbench">
            <div className="admin-work-col">
              <p className="admin-md-label">Markdown 正文</p>
              <textarea
                className="admin-md-input"
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder={"## 二级标题开始正文\n\n支持代码块高亮：\n\n```java\npublic class Main { }\n```"}
                spellCheck={false}
              />
            </div>

            <div className="admin-work-col">
              <p className="admin-md-label">预览</p>
              <div ref={previewRef} className="prose admin-preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>

          <div className="admin-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "保存中…" : editing ? "保存修改" : "发布文章"}
            </button>
            <span className="admin-hint">
              {editing ? `正在编辑 /articles/${editing.slug}` : "新文章（发布后 slug 不可改）"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

// ===== 登录视图 =====

function LoginView({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.adminLogin(password);
      setAdminToken(token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container admin-login-wrap">
      <form className="admin-login" onSubmit={handleSubmit}>
        <p className="eyebrow">Studio</p>
        <h1 className="admin-title">写作台登录</h1>
        <p className="admin-login-hint">输入管理密码进入写作台</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理密码"
          autoComplete="current-password"
          autoFocus
        />
        {error && <p className="admin-login-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading || !password}>
          {loading ? "验证中…" : "进入写作台"}
        </button>
      </form>
    </div>
  );
}
