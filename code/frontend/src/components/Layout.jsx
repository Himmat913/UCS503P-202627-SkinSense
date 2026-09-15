import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import DemoBanner from "./DemoBanner";
import ThemeToggle from "./ThemeToggle";
import { UserIcon } from "./Icons";
import { useAnalysis } from "../context/AnalysisContext";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Analyse", end: true },
  { to: "/profile", label: "Skin profile" },
  { to: "/ingredients", label: "Ingredients" },
  { to: "/about", label: "About" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { reset } = useAnalysis();
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    reset();
  }

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={reset}>
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            SkinSense
          </Link>

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

          <div className="row" style={{ gap: "0.5rem" }}>
            {isLoggedIn && pathname !== "/" && (
              <Link to="/" className="btn btn-ghost btn-sm" onClick={reset}>
                New scan
              </Link>
            )}

            {isLoggedIn ? (
              <div className="row" style={{ gap: "0.4rem" }}>
                <span className="badge" title={user?.email}>
                  <UserIcon size={13} />
                  {user?.email?.split("@")[0] || "Account"}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>
                Log in
              </button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      <DemoBanner />

      <main className="app-main">
        <div className="container">{children}</div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>SkinSense — UCS503P, Thapar Institute of Engineering and Technology</span>
          <span>Not a medical device. Always consult a dermatologist for diagnosis.</span>
        </div>
      </footer>
    </div>
  );
}