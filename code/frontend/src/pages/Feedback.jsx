import { useState } from "react";
import { Link } from "react-router-dom";

import { CheckIcon, StarIcon } from "../components/Icons";
import { submitFeedback } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating" role="radiogroup" aria-label="Clarity rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="star-btn"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          aria-pressed={value === star}
        >
          <StarIcon filled={star <= (hover || value)} size={28} />
        </button>
      ))}
      {value > 0 && <span className="text-sm muted" style={{ marginLeft: "0.5rem" }}>{value} / 5</span>}
    </div>
  );
}

export default function Feedback() {
  const { prediction, recommendations } = useAnalysis();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({
        clarity_rating: rating,
        comment,
        skin_type: prediction?.skin_type || null,
        acne_severity: prediction?.acne_severity || null,
        engine_version: recommendations?.engine_version || null,
        product_count: recommendations?.products?.length ?? null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header enter">
        <h1>How clear were your results?</h1>
        <p>Your rating helps us see whether the recommendations and their reasons actually make sense.</p>
      </header>

      {submitted ? (
        <div className="card" style={{ maxWidth: "540px" }}>
          <div className="card-body stack" style={{ alignItems: "center", padding: "2.5rem" }}>
            <CheckIcon size={32} />
            <h2>Thanks for your feedback</h2>
            <p className="text-sm muted" style={{ textAlign: "center" }}>Your rating and comment have been recorded.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>Start a new scan</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: "540px" }}>
          <div className="card-body stack-lg">
            <div className="field">
              <label className="label">How well did you understand why each product was recommended or excluded?</label>
              <StarRating value={rating} onChange={setRating} />
              <span className="hint">1 = nothing made sense · 5 = every reason was clear</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="comment">Anything you'd change?</label>
              <textarea
                id="comment"
                className="input"
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="e.g. I didn't understand why X was excluded, the morning routine had too many steps…"
                style={{ height: "auto", paddingBlock: "0.5rem" }}
              />
            </div>

            {prediction && (
              <div className="alert">
                <div className="alert-body">
                  <span className="text-sm muted">
                    Attached context: {prediction.skin_type} skin, {prediction.acne_severity} acne,{" "}
                    {recommendations?.products?.length ?? "?"} products shown.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button type="button" className="btn btn-primary btn-lg" disabled={rating === 0 || busy} onClick={handleSubmit}>
              {busy ? (<><span className="spinner" aria-hidden="true" />Submitting…</>) : "Submit feedback"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}