import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { LogOutIcon, MenuIcon, XIcon } from "./Icons";
import { useAnalysis } from "../context/useAnalysis";
import { useAuth } from "../context/useAuth";

const APP_NAV = [
  { to: "/analyze", label: "Skin check" },
  { to: "/report", label: "Results" },
  { to: "/routine", label: "Routine" },
  { to: "/progress", label: "Progress" },
  { to: "/profile", label: "Profile" },
];

const PUBLIC_NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#recommendations", label: "Recommendations" },
  { href: "/#faq", label: "FAQ" },
];

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M8 60V30a24 24 0 0 1 48 0v30z" fill="#FFDEDD" />
      <path d="M32 14c7 10 12 17 12 24a12 12 0 0 1-24 0c0-7 5-14 12-24z" fill="#CC2668" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { reset, prediction } = useAnalysis();
  const { isLoggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const initial = (user?.email || "?").charAt(0).toUpperCase();
  const appNav = APP_NAV.filter((item) => item.to !== "/report" || prediction);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="SkinSense home">
            <BrandMark />
            <span>SkinSense</span>
          </Link>

          <nav className={`primary-nav ${menuOpen ? "is-open" : ""}`} id="primary-nav" aria-label="Main">
            {isLoggedIn
              ? appNav.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
                    {item.label}
                  </NavLink>
                ))
              : PUBLIC_NAV.map((item) => (
                  <a key={item.href} href={item.href} className="nav-link" onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </a>
                ))}

            <div className="nav-mobile-actions">
              {isLoggedIn ? (
                <button type="button" className="btn btn-quiet btn-block" onClick={logout}>
                  <LogOutIcon />
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn btn-quiet btn-block">
                    Log in
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-block">
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="header-actions">
            {isLoggedIn ? (
              <>
                <Link to="/analyze" className="btn btn-primary btn-sm header-cta" onClick={reset}>
                  New skin check
                </Link>
                <Link to="/profile" className="avatar" title={user?.email || "Your profile"} aria-label="Your profile">
                  {initial}
                </Link>
                <button type="button" className="icon-btn header-logout" onClick={logout} aria-label="Log out" title="Log out">
                  <LogOutIcon />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-quiet btn-sm header-login">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm header-cta">
                  Create account
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="site-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Link to="/" className="brand brand-small">
              <BrandMark />
              <span>SkinSense</span>
            </Link>
            <p>
              AI-assisted skin analysis and skincare guidance. SkinSense is not a medical device and does
              not diagnose skin conditions. See a dermatologist for diagnosis or treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
