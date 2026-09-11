import { useEffect, useState } from "react";

import ModuleBadge, { ModuleNote } from "../components/ModuleBadge";
import { AlertIcon, FlaskIcon } from "../components/Icons";
import { getIngredients } from "../api/client";

const SEVERITY_LABELS = {
  "avoid together": { label: "Avoid together", tone: "destructive" },
  separate: { label: "Separate AM / PM", tone: "warning" },
  caution: { label: "Caution", tone: "muted" },
};

export default function Ingredients() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getIngredients()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const ingredients = data?.ingredients || [];
  const conflicts = data?.conflicts || [];

  const filtered = filter
    ? ingredients.filter(
        (ing) =>
          ing.name.toLowerCase().includes(filter.toLowerCase()) ||
          ing.type.toLowerCase().includes(filter.toLowerCase()),
      )
    : ingredients;

  return (
    <>
      <header className="page-header">
        <div className="row" style={{ gap: "0.5rem" }}>
          <FlaskIcon />
          <h1>Ingredient reference</h1>
        </div>
        <p>
          Every ingredient the engine can match against, plus the conflict pairs that
          prevent two actives from landing in the same routine step.
        </p>
        <ModuleNote module="recommendations" />
      </header>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon"><AlertIcon /></span>
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------- ingredients */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2>Ingredients</h2>
          <input
            className="input"
            style={{ maxWidth: "240px" }}
            placeholder="Filter…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        {!data && !error && (
          <div className="card">
            <div className="empty">
              <span className="spinner" aria-hidden="true" style={{ margin: "0 auto 0.75rem" }} />
              <div>Loading ingredient catalog…</div>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Type</th>
                    <th>Suits</th>
                    <th>What it does</th>
                    <th>Caution</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ing) => (
                    <tr key={ing.name}>
                      <td className="cell-name">{ing.name}</td>
                      <td>
                        <span className="badge badge-outline">{ing.type}</span>
                      </td>
                      <td>
                        {ing.suits.length > 0
                          ? ing.suits.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ")
                          : "—"}
                      </td>
                      <td>{ing.role}</td>
                      <td className="text-sm muted">{ing.caution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* --------------------------------------------------- conflicts */}
      <section>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2>Conflict pairs</h2>
          <ModuleBadge module="conflicts" />
        </div>

        <p className="text-sm muted" style={{ marginBottom: "1rem" }}>
          When two of these ingredients appear in the same scan, the engine separates
          them across morning and evening or drops one from the recommendation. Every
          rule here carries a sourced reason.
        </p>

        {conflicts.length > 0 && (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ingredient A</th>
                    <th>Ingredient B</th>
                    <th>Severity</th>
                    <th>Why</th>
                    <th>Handling</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((c) => {
                    const sev = SEVERITY_LABELS[c.severity] || {
                      label: c.severity,
                      tone: "muted",
                    };
                    return (
                      <tr key={`${c.a}-${c.b}`}>
                        <td className="cell-name">{c.a}</td>
                        <td className="cell-name">{c.b}</td>
                        <td>
                          <span className={`badge badge-${sev.tone}`}>{sev.label}</span>
                        </td>
                        <td className="text-sm">{c.reason}</td>
                        <td className="text-sm muted">{c.handling}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
