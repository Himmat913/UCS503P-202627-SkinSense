import { useState } from "react";

import { CheckIcon, UserIcon } from "../components/Icons";
import { useAnalysis } from "../context/AnalysisContext";

export default function Profile() {
  const { profile, setProfile } = useAnalysis();

  const [allergies, setAllergies] = useState(profile.allergies?.join(", ") || "");
  const [budget, setBudget] = useState(
    profile.budgetMax != null ? String(profile.budgetMax) : "",
  );
  const [notes, setNotes] = useState(profile.notes || "");
  const [saved, setSaved] = useState(false);

  function handleSave(event) {
    event.preventDefault();
    setProfile({
      allergies: allergies
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      budgetMax: budget.trim() === "" ? null : Number(budget),
      notes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <header className="page-header">
        <div className="row" style={{ gap: "0.5rem" }}>
          <UserIcon />
          <h1>Your skin profile</h1>
        </div>
        <p>
          These preferences are saved in your browser and applied automatically each
          time you run a scan. Nothing leaves your device.
        </p>
      </header>

      <div className="card" style={{ maxWidth: "640px" }}>
        <div className="card-body stack-lg">
          <div className="field">
            <label className="label" htmlFor="allergies">
              Ingredients you want excluded
            </label>
            <input
              id="allergies"
              className="input"
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              placeholder="fragrance, salicylic acid, retinol"
            />
            <span className="hint">
              Comma-separated. Any product containing a listed ingredient is filtered out
              and moves to the "Excluded" list with a reason.
            </span>
          </div>

          <div className="field">
            <label className="label" htmlFor="budget">
              Per-product budget (₹)
            </label>
            <input
              id="budget"
              className="input"
              type="number"
              min="0"
              step="50"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="No limit"
            />
            <span className="hint">
              Products above this price are excluded. Leave blank for no ceiling.
            </span>
          </div>

          <div className="field">
            <label className="label" htmlFor="notes">
              Anything else a recommendation should consider
            </label>
            <textarea
              id="notes"
              className="input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. I've been on tretinoin for 6 months, my T-zone is oilier than my cheeks"
              style={{ height: "auto", paddingBlock: "0.5rem" }}
            />
            <span className="hint">
              Free text — shown alongside the scan results for your reference. Not parsed
              by the engine yet.
            </span>
          </div>

          <button type="button" className="btn btn-primary btn-lg" onClick={handleSave}>
            {saved ? (
              <>
                <CheckIcon />
                Saved
              </>
            ) : (
              "Save profile"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
