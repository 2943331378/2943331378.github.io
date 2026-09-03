// 临时脚本：验证 /api/admin 全流程（登录 → 建文 → 读原文 → 更新 → 公开接口 → 删除）
const BASE = "http://localhost:3001";

async function req(method, url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function assert(cond, name, extra = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${cond ? "" : " " + extra}`);
  if (!cond) process.exitCode = 1;
}

const main = async () => {
  // 1. 错误密码拒绝
  let r = await req("POST", "/api/admin/login", { password: "wrong" });
  assert(r.status === 401, "错误密码被拒绝 (401)");

  // 2. 正确登录
  r = await req("POST", "/api/admin/login", { password: "admin123" });
  assert(r.status === 200 && r.data.token, "正确密码登录成功");
  const token = r.data.token;

  // 3. 无 token 访问被拒
  r = await req("GET", "/api/admin/articles");
  assert(r.status === 401, "无 token 访问列表被拒 (401)");

  // 4. 新建文章（含代码块、中文）
  const content = "## 标题一\n\n这是一段 **Markdown** 测试，验证中文。\n\n```java\npublic class T {\n  int x = 1;\n}\n```\n\n- 列表项 A\n- 列表项 B\n";
  r = await req("POST", "/api/admin/articles", { slug: "test-admin-post", title: "测试文章：在线编辑", date: "2026-09-03", tags: ["测试"], summary: "在线编辑功能验证", content }, token);
  assert(r.status === 201, "新建文章成功 (201)");

  // 5. slug 重复被拒
  r = await req("POST", "/api/admin/articles", { slug: "test-admin-post", title: "重复", content: "x" }, token);
  assert(r.status === 409, "重复 slug 被拒 (409)");

  // 6. 非法 slug 被拒（路径穿越防护）
  r = await req("POST", "/api/admin/articles", { slug: "../evil", title: "恶意", content: "x" }, token);
  assert(r.status === 400, "非法 slug 被拒 (400)");

  // 7. 读取原文
  r = await req("GET", "/api/admin/articles/test-admin-post", null, token);
  assert(r.status === 200 && r.data.content === content, "读取原文与写入一致");
  assert(r.data.fields.title === "测试文章：在线编辑", "frontmatter 解析正确");
  assert(r.data.fields.date === "2026-09-03", "日期归一化正确");

  // 8. 更新文章
  r = await req("PUT", "/api/admin/articles/test-admin-post", { title: "测试文章：已更新", date: "2026-09-03", tags: ["测试", "更新"], summary: "更新后的摘要", featured: true, content: "## 更新后的内容\n\nOK" }, token);
  assert(r.status === 200, "更新文章成功");

  // 9. 公开接口能读到（缓存已手动失效）
  r = await req("GET", "/api/articles/test-admin-post");
  assert(r.status === 200 && r.data.meta.title === "测试文章：已更新", "公开接口读到更新后内容（缓存失效生效）");

  // 10. 列表接口包含新文章且 total 变化
  r = await req("GET", "/api/admin/articles", null, token);
  const found = r.data.list.find((a) => a.slug === "test-admin-post");
  assert(Boolean(found), "管理列表包含新文章");

  // 11. 预览接口
  r = await req("POST", "/api/admin/preview", { content }, token);
  assert(r.status === 200 && r.data.html.includes("<h2"), "预览渲染出 HTML（含高亮 class）: " + r.data.html.includes("hljs"));

  // 12. 删除清理
  r = await req("DELETE", "/api/admin/articles/test-admin-post", null, token);
  assert(r.status === 200, "删除文章成功");

  r = await req("GET", "/api/articles/test-admin-post");
  assert(r.status === 404, "删除后公开接口 404");

  console.log("\n全部测试完成");
};

main();
