import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import Notice from "../components/Notice";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/analyze";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      intro="Log in to run a skin check and see your saved routine."
      aside="Your preferences and past checks are waiting for you."
    >
      <form className="auth-fields" onSubmit={handleSubmit} noValidate={false}>
        {error && <Notice tone="error">{error}</Notice>}

        <div className="field">
          <label className="field-label" htmlFor="login-email">
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
          <label className="field-label" htmlFor="login-password">
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

        <p className="auth-switch">
          New to SkinSense?{" "}
          <Link to="/register" className="text-link">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
