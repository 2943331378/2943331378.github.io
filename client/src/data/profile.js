// 站点与个人资料（与文章内容分离，便于替换）

export const PROFILE = {
  siteName: "CodeArt",
  owner: "宁悦童",
  title: "Java 后端开发者的成长空间",
  kicker: "Java Backend Developer",
  heroTitle: "记录 Java 后端的成长与思考",
  heroSub:
    "专注 Spring 全家桶 · 微服务 · 数据库。把每一段踩坑与领悟，沉淀成文字。",
  about:
    "2023 级计算机科学与技术专业本科生，Java 后端方向。热爱钻研底层原理，相信扎实的基础与持续的写作是成为优秀工程师的关键。",
  skills: ["Java SE", "Spring Boot / Spring Cloud", "MySQL / Redis", "Linux / Docker"],
  contact: {
    email: "email@example.com",
    github: "https://github.com/",
  },
};

export const NAV_LINKS = [
  { to: "/", label: "首页" },
  { to: "/articles", label: "文章" },
  { to: "/archive", label: "归档" },
];
