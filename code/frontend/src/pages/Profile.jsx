import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { CheckIcon, LogOutIcon } from "../components/Icons";
import ChipInput from "../components/ChipInput";
import { useAnalysis } from "../context/AnalysisContext";
import { useAuth } from "../context/AuthContext";

function formatMemberSince(createdAt) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function Profile() {
  const { profile, setProfile, recommendations } = useAnalysis();
  const { user, logout } = useAuth();

  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);
  const [budget, setBudget] = useState(profile.budgetMax != null ? String(profile.budgetMax) : "");
  const [notes, setNotes] = useState(profile.notes || "");
  const [saved, setSaved] = useState(false);

  function handleSave(event) {
    event.preventDefault();
    setProfile((prev) => ({
      ...prev,
      avoidIngredients: avoidList,
      budgetMax: budget.trim() === "" ? null : Number(budget),
      notes,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initial = (user?.email || "?").charAt(0).toUpperCase();
  const memberSince = formatMemberSince(user?.created_at);
  const routine = profile.routine;

  const routineStepCount = useMemo(() => {
    if (!routine) return 0;
    const ids = new Set([...routine.am.map((s) => s.id), ...routine.pm.map((s) => s.id)]);
    return ids.size;
  }, [routine]);

  return (
    <>
      <header className="page-header enter">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row" style={{ gap: "0.85rem" }}>
            <span className="avatar avatar-lg">{initial}</span>
            <div className="stack" style={{ gap: "0.15rem" }}>
              <h1 style={{ fontSize: "1.375rem" }}>Your profile</h1>
              <span className="text-sm muted">
                {user?.email || "—"}
                {memberSince && ` · Member since ${memberSince}`}
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
            <LogOutIcon size={16} />
            Log out
          </button>
        </div>
      </header>

      <div className="grid-3" style={{ marginBottom: "1.75rem" }}>
        <div className="card stat-card">
          <div className="card-body metric" style={{ gap: "0.3rem" }}>
            <span className="metric-label">Skin type</span>
            <span className="metric-value" style={{ fontSize: "1.25rem" }}>{profile.lastSkinType || "Not yet scanned"}</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="card-body metric" style={{ gap: "0.3rem" }}>
            <span className="metric-label">Avoiding</span>
            <span className="metric-value" style={{ fontSize: "1.25rem" }}>
              {profile.avoidIngredients?.length || 0} ingredient{(profile.avoidIngredients?.length || 0) === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="card-body metric" style={{ gap: "0.3rem" }}>
            <span className="metric-label">Routine</span>
            <span className="metric-value" style={{ fontSize: "1.25rem" }}>
              {routineStepCount} step{routineStepCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="stack-lg" style={{ maxWidth: "680px" }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Your skin</h3></div>
          <div className="card-body">
            {profile.lastSkinType ? (
              <div className="grid-2">
                <div className="stack" style={{ gap: "0.2rem" }}>
                  <span className="metric-label">Skin type</span>
                  <span className="metric-value" style={{ fontSize: "1.25rem" }}>{profile.lastSkinType}</span>
                </div>
                {profile.lastSeverity && (
                  <div className="stack" style={{ gap: "0.2rem" }}>
                    <span className="metric-label">Acne severity</span>
                    <span className="metric-value" style={{ fontSize: "1.25rem" }}>{profile.lastSeverity}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="text-sm muted">No scan yet.</span>
                <Link to="/" className="btn btn-outline btn-sm">Run a scan</Link>
              </div>
            )}
          </div>
        </div>

        <form className="card" onSubmit={handleSave}>
          <div className="card-header"><h3 className="card-title">Your preferences</h3></div>
          <div className="card-body stack-lg">
            <div className="field">
              <label className="label" htmlFor="profile-avoid">Ingredients or products you want excluded</label>
              <ChipInput id="profile-avoid" value={avoidList} onChange={setAvoidList} placeholder="fragrance, salicylic acid…" />
              <span className="hint">Applied automatically every time you run a scan.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="profile-budget">Per-product budget (₹)</label>
              <input
                id="profile-budget"
                className="input"
                type="number"
                min="0"
                step="50"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="No limit"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="profile-notes">Anything else worth knowing</label>
              <textarea
                id="profile-notes"
                className="input"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. I've been on tretinoin for 6 months, my T-zone runs oilier than my cheeks"
                style={{ height: "auto", paddingBlock: "0.5rem" }}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg">
              {saved ? (<><CheckIcon />Saved</>) : "Save preferences"}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your routine</h3>
            {routine && <Link to="/routine" className="btn btn-ghost btn-sm">Edit</Link>}
          </div>
          <div className="card-body">
            {routine ? (
              <div className="grid-2">
                <div>
                  <span className="metric-label">Morning</span>
                  <div style={{ marginTop: "0.4rem" }}>
                    {routine.am.length === 0 ? (
                      <p className="text-sm muted">No steps saved.</p>
                    ) : (
                      routine.am.map((step, index) => (
                        <div className="routine-step" key={`am-${step.id}-${index}`}>
                          <span className="routine-order">{index + 1}</span>
                          <span>{step.name}</span>
                          <span className="routine-category">{step.category}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <span className="metric-label">Evening</span>
                  <div style={{ marginTop: "0.4rem" }}>
                    {routine.pm.length === 0 ? (
                      <p className="text-sm muted">No steps saved.</p>
                    ) : (
                      routine.pm.map((step, index) => (
                        <div className="routine-step" key={`pm-${step.id}-${index}`}>
                          <span className="routine-order">{index + 1}</span>
                          <span>{step.name}</span>
                          <span className="routine-category">{step.category}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="text-sm muted">
                  {recommendations ? "Not built yet." : "Run a scan, then build one from your report."}
                </span>
                {recommendations && <Link to="/routine" className="btn btn-outline btn-sm">Build routine</Link>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}