import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AlertIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg" style={{ maxWidth: "380px", margin: "3rem auto" }}>
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1>Welcome back</h1>
        <p>Log in to analyse your skin and get your routine.</p>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-body stack">
          {error && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">
                <AlertIcon />
              </span>
              <span>{error}</span>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Logging in…
              </>
            ) : (
              "Log in"
            )}
          </button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            Don't have an account? <Link to="/register" className="link">Create one</Link>
          </p>
        </div>
      </form>
    </div>
  );
}