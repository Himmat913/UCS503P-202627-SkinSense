import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ChipInput from "../components/ChipInput";
import Notice from "../components/Notice";
import { ArrowRightIcon, CheckIcon, ClockIcon, LogOutIcon, MoonIcon, SunIcon } from "../components/Icons";
import { getAnalysisHistory } from "../api/client";
import { useAnalysis } from "../context/useAnalysis";
import { useAuth } from "../context/useAuth";
import { SEVERITIES, SKIN_TYPES, categoryMeta, formatDate, formatPrice, labelFor, parseServerDate } from "../lib/skin";

const SOURCE_LABEL = { model: "Photo", manual: "Self-reported", stub: "Photo (no model)" };

export default function Profile() {
  const { user, logout } = useAuth();
  const { profile, setProfile } = useAnalysis();

  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);
  const [budget, setBudget] = useState(profile.budgetMax != null ? String(profile.budgetMax) : "");
  const [notes, setNotes] = useState(profile.notes || "");
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAnalysisHistory(30)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function savePreferences(event) {
    event.preventDefault();
    const trimmed = budget.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      setFormError("Enter a price above zero, or leave it empty for no limit.");
      return;
    }
    setFormError(null);
    setProfile((prev) => ({
      ...prev,
      avoidIngredients: avoidList,
      budgetMax: value === null ? null : Math.round(value),
      notes: notes.trim(),
    }));
    setSaved(true);
  }

  const items = history?.items || [];
  const latest = items[0];
  const memberSince = user?.created_at ? formatDate(parseServerDate(user.created_at)) : null;
  const routine = profile.routine;

  return (
    <div className="container page profile">
      <header className="profile-head">
        <div className="profile-id">
          <span className="avatar avatar-lg" aria-hidden="true">
            {(user?.email || "?").charAt(0).toUpperCase()}
          </span>
          <div>
            <h1>Your profile</h1>
            <p className="profile-email">{user?.email || "Signed in"}</p>
            {memberSince && <p className="field-hint">Member since {memberSince}</p>}
          </div>
        </div>
        <div className="profile-head-actions">
          <button type="button" className="btn btn-quiet" onClick={logout}>
            <LogOutIcon />
            Log out
          </button>
        </div>
      </header>

      <dl className="profile-stats">
        <div className="profile-stat tone-pink">
          <dt>Skin type</dt>
          <dd>{latest ? labelFor(SKIN_TYPES, latest.skin_type) : profile.lastSkinType ? labelFor(SKIN_TYPES, profile.lastSkinType) : "Not set"}</dd>
        </div>
        <div className="profile-stat tone-mint">
          <dt>Latest acne reading</dt>
          <dd>{latest ? labelFor(SEVERITIES, latest.acne_severity) : "No checks yet"}</dd>
        </div>
        <div className="profile-stat tone-butter">
          <dt>Checks saved</dt>
          <dd>{history ? history.total : "…"}</dd>
        </div>
      </dl>

      <div className="profile-grid">
        <section className="panel" aria-labelledby="history-heading">
          <div className="panel-head">
            <div>
              <h2 id="history-heading" className="panel-title">
                Your checks
              </h2>
              <p className="panel-sub">Every check you run is saved to your account.</p>
            </div>
          </div>

          {historyError && (
            <Notice tone="error" title="Your checks couldn't be loaded">
              <p>{historyError}</p>
            </Notice>
          )}
          {!history && !historyError && (
            <p className="rec-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Loading your checks…
            </p>
          )}
          {history && items.length === 0 && (
            <div className="empty empty-compact">
              <p>You haven't run a skin check yet.</p>
              <Link to="/analyze" className="btn btn-outline btn-sm">
                Run your first check
              </Link>
            </div>
          )}
          {items.length > 0 && (
            <>
              <Link to="/progress" className="progress-teaser">
                <span className="progress-teaser-icon" aria-hidden="true">
                  <ClockIcon />
                </span>
                <span className="progress-teaser-text">
                  <span className="progress-teaser-title">See your weekly progress</span>
                  <span className="progress-teaser-sub">
                    Trend, streak and feedback across {history.total} check{history.total === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRightIcon />
              </Link>
              <ol className="history-list">
                {items.map((item) => (
                  <li key={item.id} className="history-item">
                    <span className={`severity-pill sev-${item.acne_severity}`}>
                      {labelFor(SEVERITIES, item.acne_severity)}
                    </span>
                    <div className="history-main">
                      <p className="history-title">
                        {labelFor(SKIN_TYPES, item.skin_type)} skin
                        {item.referral_needed && <span className="tag tag-butter">Dermatologist suggested</span>}
                      </p>
                      <p className="history-meta">
                        {formatDate(parseServerDate(item.created_at), true)}, {SOURCE_LABEL[item.source] || item.source}
                        {item.source !== "manual" && ` with ${Math.round(item.acne_severity_confidence * 100)}% confidence`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {history.total > items.length && (
                <p className="field-hint">Showing your latest {items.length} of {history.total} checks.</p>
              )}
            </>
          )}
        </section>

        <div className="profile-side">
          <form className="panel" onSubmit={savePreferences} aria-labelledby="prefs-heading">
            <h2 id="prefs-heading" className="panel-title">
              Preferences
            </h2>
            <p className="panel-sub">Applied to every new check. Saved in this browser for your account.</p>

            <div className="prefs-fields">
              <div className="field">
                <label className="field-label" htmlFor="profile-avoid">
                  Ingredients to leave out
                </label>
                <ChipInput
                  id="profile-avoid"
                  value={avoidList}
                  onChange={(value) => {
                    setAvoidList(value);
                    setSaved(false);
                  }}
                  placeholder="e.g. fragrance"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="profile-budget">
                  Max price per product
                </label>
                <div className="input-prefix">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="profile-budget"
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="No limit"
                    value={budget}
                    onChange={(event) => {
                      setBudget(event.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="profile-notes">
                  Notes for yourself <span className="optional">Optional</span>
                </label>
                <textarea
                  id="profile-notes"
                  className="textarea"
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="e.g. T-zone gets oily by afternoon"
                />
              </div>

              {formError && <Notice tone="error">{formError}</Notice>}

              <button type="submit" className="btn btn-primary btn-block">
                {saved ? (
                  <>
                    <CheckIcon />
                    Preferences saved
                  </>
                ) : (
                  "Save preferences"
                )}
              </button>
            </div>
          </form>

          <section className="panel" aria-labelledby="saved-routine-heading">
            <div className="panel-head">
              <h2 id="saved-routine-heading" className="panel-title">
                Saved routine
              </h2>
              {routine?.savedAt && <p className="field-hint">Saved {formatDate(routine.savedAt)}</p>}
            </div>
            {routine && (routine.am?.length || routine.pm?.length) ? (
              <div className="saved-routine">
                {[
                  { key: "am", title: "Morning", icon: <SunIcon size={18} /> },
                  { key: "pm", title: "Evening", icon: <MoonIcon size={18} /> },
                ].map((slot) =>
                  routine[slot.key]?.length ? (
                    <div key={slot.key}>
                      <p className="saved-slot">
                        {slot.icon}
                        {slot.title}
                      </p>
                      <ol className="routine-steps routine-steps-compact">
                        {routine[slot.key].map((step) => (
                          <li key={`${slot.key}-${step.id}`}>
                            <span className="routine-step-name">{step.name}</span>
                            <span className="routine-step-cat">
                              {categoryMeta(step.category).label}
                              {step.price ? `, ${formatPrice(step.price)}` : ""}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="empty empty-compact">
                <p>No routine saved yet. Build one after a skin check.</p>
                <Link to="/analyze" className="btn btn-outline btn-sm">
                  Start a skin check
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
