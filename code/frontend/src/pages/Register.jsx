import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AlertIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

// Mirrors the backend's password rule: min 8 chars, letters and numbers.
function passwordError(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (/^[a-zA-Z]+$/.test(password)) return "Password must contain both letters and numbers.";
  if (/^[0-9]+$/.test(password)) return "Password must contain both letters and numbers.";
  return null;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const pwError = passwordError(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await register(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists.");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg" style={{ maxWidth: "380px", margin: "3rem auto" }}>
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1>Create your account</h1>
        <p>Your scans, profile, and preferences will be saved to it.</p>
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
            <label className="label" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              className="input"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="hint">At least 8 characters, with both letters and numbers.</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="register-confirm">
              Confirm password
            </label>
            <input
              id="register-confirm"
              className="input"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>

          <p className="text-sm muted" style={{ textAlign: "center" }}>
            Already have an account? <Link to="/login" className="link">Log in</Link>
          </p>
        </div>
      </form>
    </div>
  );
}