import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import Notice from "../components/Notice";
import { ApiError } from "../api/client";
import { useAuth } from "../context/useAuth";

/** Mirrors the backend rule: at least 8 characters with letters and numbers. */
function passwordProblem(password) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Use both letters and numbers.";
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

    const problem = passwordProblem(password);
    if (problem) {
      setError(`Choose a stronger password. ${problem}`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await register(email.trim(), password);
      navigate("/analyze", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists. Log in instead.");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      intro="Your checks, preferences and routine are saved to it."
      aside="One photo, a few choices, and a routine built around your skin."
    >
      <form className="auth-fields" onSubmit={handleSubmit}>
        {error && <Notice tone="error">{error}</Notice>}

        <div className="field">
          <label className="field-label" htmlFor="register-email">
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
          <label className="field-label" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            className="input"
            type="password"
            required
            autoComplete="new-password"
            aria-describedby="register-password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="field-hint" id="register-password-hint">
            At least 8 characters, with letters and numbers.
          </p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-confirm">
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

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="text-link">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
