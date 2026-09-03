import { Link } from "react-router-dom";
import { PROFILE } from "../data/profile.js";
import "./footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">{PROFILE.siteName}</span>
          <p className="footer-tagline">React + Node.js · 前后端分离全栈博客</p>
        </div>

        <div className="footer-meta">
          <p className="footer-owner">
            © {year} {PROFILE.owner} · {PROFILE.siteName}
          </p>
          {PROFILE.contact.github && (
            <a
              className="footer-link"
              href={PROFILE.contact.github}
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          )}
          <Link className="footer-link" to="/admin" title="写作台">
            写作台
          </Link>
        </div>
      </div>
    </footer>
  );
}
