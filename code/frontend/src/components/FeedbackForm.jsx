import { useState } from "react";

import Notice from "./Notice";
import { CheckIcon, StarIcon } from "./Icons";
import { submitFeedback } from "../api/client";

const LABELS = ["", "Not clear at all", "Mostly unclear", "Somewhat clear", "Clear", "Very clear"];

export default function FeedbackForm({ prediction, recommendations }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      setError("Choose a rating from 1 to 5 stars first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({
        clarity_rating: rating,
        comment: comment.trim(),
        skin_type: prediction?.skin_type ?? null,
        acne_severity: prediction?.acne_severity ?? null,
        engine_version: recommendations?.engine_version ?? null,
        product_count: recommendations?.products?.length ?? null,
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="feedback feedback-sent" role="status">
        <span className="feedback-check" aria-hidden="true">
          <CheckIcon />
        </span>
        <div>
          <h2 className="panel-title">Thanks, your rating was sent</h2>
          <p>It helps us see whether the reasons behind each pick make sense.</p>
        </div>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form className="feedback" onSubmit={handleSubmit}>
      <div className="feedback-intro">
        <h2 className="panel-title">Were the reasons clear?</h2>
        <p>Rate how well you understood why each product was picked or left out.</p>
      </div>

      <fieldset className="feedback-rating">
        <legend className="sr-only">Clarity rating</legend>
        <div className="stars" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`star ${value <= shown ? "is-on" : ""}`}
              aria-label={`${value} star${value > 1 ? "s" : ""}, ${LABELS[value]}`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onFocus={() => setHover(value)}
              onBlur={() => setHover(0)}
              onClick={() => setRating(value)}
            >
              <StarIcon filled={value <= shown} />
            </button>
          ))}
        </div>
        <p className="field-hint" aria-live="polite">
          {shown ? LABELS[shown] : "1 is not clear at all, 5 is very clear"}
        </p>
      </fieldset>

      <div className="field feedback-comment">
        <label className="field-label" htmlFor="feedback-comment">
          Anything we should change? <span className="optional">Optional</span>
        </label>
        <textarea
          id="feedback-comment"
          className="textarea"
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="e.g. I didn't understand why a product was left out"
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Send rating"
        )}
      </button>
    </form>
  );
}
