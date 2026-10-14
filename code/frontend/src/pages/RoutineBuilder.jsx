import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import StepIndicator from "../components/StepIndicator";
import { CheckIcon } from "../components/Icons";
import { useAnalysis } from "../context/AnalysisContext";

const CATEGORY_ORDER = ["cleanser", "toner", "treatment", "serum", "moisturiser", "sunscreen"];
const BASIC_CATEGORIES = new Set(["cleanser", "moisturiser", "sunscreen"]);
const ADDON_CATEGORIES = ["toner", "serum", "treatment"];
const CATEGORY_LABELS = {
  cleanser: "Cleanser",
  toner: "Toner",
  treatment: "Treatment",
  serum: "Serum",
  moisturiser: "Moisturiser",
  sunscreen: "Sunscreen",
};
const ADDON_HINTS = {
  toner: "Preps skin after cleansing",
  serum: "Targets a specific concern",
  treatment: "Active ingredient for acne",
};

/** Returns [] (never throws) if a product's step_time is missing or unrecognized. */
function compatibleSlots(product) {
  if (product.category === "sunscreen") return ["am"];
  if (product.step_time === "both") return ["am", "pm"];
  if (product.step_time === "am" || product.step_time === "pm") return [product.step_time];
  return [];
}

function buildSlotOptions(products) {
  const map = {};
  for (const product of products) {
    for (const slot of compatibleSlots(product)) {
      if (slot !== "am" && slot !== "pm") continue;
      if (!map[product.category]) map[product.category] = { am: [], pm: [] };
      map[product.category][slot].push(product);
    }
  }
  for (const category of Object.keys(map)) {
    map[category].am.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    map[category].pm.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }
  return map;
}

function categoryOptions(slotOptions, category) {
  const entry = slotOptions[category];
  if (!entry) return [];
  const byId = new Map();
  for (const product of [...entry.am, ...entry.pm]) byId.set(product.id, product);
  return [...byId.values()].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
}

export default function RoutineBuilder() {
  const { recommendations, setProfile } = useAnalysis();

  const products = useMemo(() => recommendations?.products || [], [recommendations]);
  const slotOptions = useMemo(() => buildSlotOptions(products), [products]);

  const [timeScope, setTimeScope] = useState("both");
  const [depth, setDepth] = useState("basic");
  const [addons, setAddons] = useState({ toner: false, serum: false, treatment: false });
  const [selection, setSelection] = useState({});
  const [saved, setSaved] = useState(false);

  function resolvedChoice(category) {
    const options = categoryOptions(slotOptions, category);
    if (options.length === 0) return null;
    const chosenId = selection[category];
    return options.find((p) => p.id === chosenId) || options[0];
  }

  if (!recommendations) {
    return (
      <>
        <StepIndicator current={3} />
        <div className="card">
          <div className="empty">
            <p>No recommendations loaded yet in this session.</p>
            <p className="text-sm" style={{ marginTop: "0.5rem" }}>
              Run a scan and open your report first — a page refresh clears this.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>Start a scan</Link>
          </div>
        </div>
      </>
    );
  }

  const activeSlots = timeScope === "both" ? ["am", "pm"] : [timeScope];
  const hasSlot = (category) => activeSlots.some((slot) => slotOptions[category]?.[slot]?.length > 0);

  const activeCategories = CATEGORY_ORDER.filter((category) => {
    if (!slotOptions[category]) return false;
    if (!BASIC_CATEGORIES.has(category) && (depth !== "custom" || !addons[category])) return false;
    return hasSlot(category);
  });

  const am = [];
  const pm = [];
  for (const category of activeCategories) {
    const chosen = resolvedChoice(category);
    if (!chosen) continue;
    for (const slot of activeSlots) {
      const options = slotOptions[category][slot];
      if (!options || options.length === 0) continue;
      const product = options.some((p) => p.id === chosen.id) ? chosen : options[0];
      (slot === "am" ? am : pm).push(product);
    }
  }
  const byOrder = (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  am.sort(byOrder);
  pm.sort(byOrder);

  const basicsShown = [...BASIC_CATEGORIES].filter((category) => slotOptions[category] && hasSlot(category));
  const addonsShown = ADDON_CATEGORIES.filter((category) => slotOptions[category] && hasSlot(category));

  function toggleAddon(category) {
    setAddons((current) => ({ ...current, [category]: !current[category] }));
  }

  function saveRoutine() {
    setProfile((prev) => ({
      ...prev,
      routine: {
        am: am.map((p) => ({ id: p.id, name: p.name, category: p.category })),
        pm: pm.map((p) => ({ id: p.id, name: p.name, category: p.category })),
      },
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <StepIndicator current={3} />

      <header className="page-header enter">
        <h1>Build your routine</h1>
        <p>Choose which part of the day you're planning, and how much you want in it.</p>
      </header>

      <div className="row" style={{ gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="field" style={{ gap: "0.5rem" }}>
          <label className="label">Which routine?</label>
          <div className="segmented">
            <button type="button" className={`segmented-btn ${timeScope === "am" ? "is-active" : ""}`} onClick={() => setTimeScope("am")}>
              Morning
            </button>
            <button type="button" className={`segmented-btn ${timeScope === "pm" ? "is-active" : ""}`} onClick={() => setTimeScope("pm")}>
              Evening
            </button>
            <button type="button" className={`segmented-btn ${timeScope === "both" ? "is-active" : ""}`} onClick={() => setTimeScope("both")}>
              Both
            </button>
          </div>
        </div>

        <div className="field" style={{ gap: "0.5rem" }}>
          <label className="label">How much?</label>
          <div className="segmented">
            <button type="button" className={`segmented-btn ${depth === "basic" ? "is-active" : ""}`} onClick={() => setDepth("basic")}>
              Basic
            </button>
            <button type="button" className={`segmented-btn ${depth === "custom" ? "is-active" : ""}`} onClick={() => setDepth("custom")}>
              Add extras
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Your basics</h3></div>
          <div className="card-body stack">
            {basicsShown.length === 0 && <p className="text-sm muted">No basic-step products matched your filters for this time of day.</p>}
            {basicsShown.map((category) => (
              <StepPicker
                key={category}
                category={category}
                options={categoryOptions(slotOptions, category)}
                value={resolvedChoice(category)?.id || ""}
                onChange={(id) => setSelection((s) => ({ ...s, [category]: id }))}
              />
            ))}
          </div>
        </div>

        {depth === "custom" ? (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Add extra steps</h3></div>
            <div className="card-body">
              {addonsShown.length === 0 && <p className="text-sm muted">No optional steps matched your filters for this time of day.</p>}
              {addonsShown.map((category) => {
                const options = categoryOptions(slotOptions, category);
                return (
                  <div className="toggle-row" key={category}>
                    <div className="toggle-copy">
                      <span className="toggle-title">{CATEGORY_LABELS[category]}</span>
                      <span className="text-sm muted">{ADDON_HINTS[category]}</span>
                      {addons[category] && options.length > 1 && (
                        <select
                          className="select select-inline"
                          style={{ marginTop: "0.35rem" }}
                          value={resolvedChoice(category)?.id || ""}
                          onChange={(event) => setSelection((s) => ({ ...s, [category]: event.target.value }))}
                        >
                          {options.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`toggle ${addons[category] ? "is-on" : ""}`}
                      role="switch"
                      aria-checked={addons[category]}
                      aria-label={`Add ${CATEGORY_LABELS[category]}`}
                      onClick={() => toggleAddon(category)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body empty">
              <p>Switch to "Add extras" to layer on a toner, serum, or treatment.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        {activeSlots.includes("am") && <RoutinePreview title="Morning" products={am} />}
        {activeSlots.includes("pm") && <RoutinePreview title="Evening" products={pm} />}
      </div>

      <div className="row">
        <button type="button" className="btn btn-primary btn-lg" onClick={saveRoutine} disabled={am.length === 0 && pm.length === 0}>
          {saved ? (<><CheckIcon />Saved</>) : "Save this routine"}
        </button>
        <Link to="/report" className="btn btn-outline">Back to report</Link>
      </div>
    </>
  );
}

function StepPicker({ category, options, value, onChange }) {
  return (
    <div className="field">
      <label className="label">{CATEGORY_LABELS[category]}</label>
      {options.length > 1 ? (
        <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      ) : (
        <div className="routine-step" style={{ padding: "0.5rem 0" }}>
          <span>{options[0]?.name}</span>
        </div>
      )}
    </div>
  );
}

function RoutinePreview({ title, products }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className="badge">{products.length} step{products.length === 1 ? "" : "s"}</span>
      </div>
      <div className="card-body" style={{ paddingBlock: "0.25rem" }}>
        {products.length === 0 ? (
          <p className="text-sm muted" style={{ padding: "0.75rem 0" }}>No steps yet.</p>
        ) : (
          products.map((product, index) => (
            <div className="routine-step" key={`${product.id}-${index}`}>
              <span className="routine-order">{index + 1}</span>
              <span>{product.name}</span>
              <span className="routine-category">{product.category}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}