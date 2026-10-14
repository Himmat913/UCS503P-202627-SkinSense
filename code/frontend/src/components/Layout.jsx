import { Link, NavLink, useLocation } from "react-router-dom";

import ThemeToggle from "./ThemeToggle";
import { LogOutIcon } from "./Icons";
import { useAnalysis } from "../context/AnalysisContext";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Analyse", end: true },
  { to: "/routine", label: "Routine" },
  { to: "/profile", label: "Profile" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { reset } = useAnalysis();
  const { isLoggedIn, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="container nav-inner">
          <Link to={isLoggedIn ? "/" : "/login"} className="brand" onClick={reset}>
            <span className="brand-mark" aria-hidden="true">S</span>
            SkinSense
          </Link>

          {isLoggedIn ? (
            <>
              <nav className="nav-links" aria-label="Main">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                {pathname !== "/" && (
                  <Link to="/" className="btn btn-ghost btn-sm" onClick={reset}>
                    New scan
                  </Link>
                )}
                <ThemeToggle />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={logout}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOutIcon size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="row" style={{ gap: "0.5rem" }}>
              <ThemeToggle />
              {pathname === "/login" ? (
                <Link to="/register" className="btn btn-outline btn-sm">Create account</Link>
              ) : (
                <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="container">{children}</div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>SkinSense</span>
          <span>Not a medical device. Always consult a dermatologist for diagnosis.</span>
        </div>
      </footer>
    </div>
  );
}