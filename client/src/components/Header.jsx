import { Link, NavLink } from "react-router-dom";
import { NAV_LINKS, PROFILE } from "../data/profile.js";
import ThemeToggle from "./ThemeToggle.jsx";
import "./header.css";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" aria-label="回到首页">
          {PROFILE.siteName}
          <span className="logo-dot">.</span>
        </Link>

        <div className="header-right">
          <nav className="nav" aria-label="主导航">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `nav-link hover-underline${isActive ? " active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
