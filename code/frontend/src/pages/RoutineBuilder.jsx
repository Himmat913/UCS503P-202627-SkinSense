import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Notice from "../components/Notice";
import Segmented from "../components/Segmented";
import StepIndicator from "../components/StepIndicator";
import { ProductArt } from "../components/Art";
import { CheckIcon, MoonIcon, SunIcon } from "../components/Icons";
import { useAnalysis } from "../context/useAnalysis";
import { CATEGORY_ORDER, categoryMeta, formatPrice } from "../lib/skin";
import {
  BASIC_CATEGORIES as BASIC,
  EXTRA_CATEGORIES as EXTRAS,
  buildSlotOptions,
  optionsFor,
} from "../lib/routine";

export default function RoutineBuilder() {
  const { recommendations, profile, setProfile } = useAnalysis();

  const products = useMemo(() => recommendations?.products || [], [recommendations]);
  const slotOptions = useMemo(() => buildSlotOptions(products), [products]);

  const [scope, setScope] = useState("both");
  const [depth, setDepth] = useState("basic");
  const [extras, setExtras] = useState({});
  const [selection, setSelection] = useState({});
  const [savedAt, setSavedAt] = useState(null);

  if (!recommendations) {
    return (
      <div className="container page">
        <StepIndicator current={3} />
        <div className="panel empty">
          <div className="empty-art" aria-hidden="true">
            <ProductArt category="cleanser" />
          </div>
          <h1>Run a skin check first</h1>
          <p>
            Your routine is built from the products recommended in your latest check. Results are cleared when
            the page is refreshed, so start a new check to build one.
          </p>
          <div className="empty-actions">
            <Link to="/analyze" className="btn btn-primary">
              Start a skin check
            </Link>
            {profile.routine && (
              <Link to="/profile" className="link-arrow">
                See your saved routine
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeSlots = scope === "both" ? ["am", "pm"] : [scope];
  const fitsScope = (category) => activeSlots.some((slot) => slotOptions[category]?.[slot]?.length > 0);

  function chosenFor(category) {
    const options = optionsFor(slotOptions, category);
    return options.find((p) => p.id === selection[category]) || options[0] || null;
  }

  const included = CATEGORY_ORDER.filter((category) => {
    if (!slotOptions[category] || !fitsScope(category)) return false;
    if (BASIC.includes(category)) return true;
    return depth === "extras" && extras[category];
  });

  const steps = { am: [], pm: [] };
  for (const category of included) {
    const chosen = chosenFor(category);
    for (const slot of activeSlots) {
      const options = slotOptions[category][slot];
      if (!options?.length) continue;
      const product = options.some((p) => p.id === chosen.id) ? chosen : options[0];
      steps[slot].push(product);
    }
  }

  const basicsAvailable = BASIC.filter((c) => slotOptions[c] && fitsScope(c));
  const extrasAvailable = EXTRAS.filter((c) => slotOptions[c] && fitsScope(c));
  const missingBasics = BASIC.filter((c) => !basicsAvailable.includes(c));
  const uniqueProducts = new Map([...steps.am, ...steps.pm].map((p) => [p.id, p]));
  const total = [...uniqueProducts.values()].reduce((sum, p) => sum + (p.price || 0), 0);
  const empty = steps.am.length === 0 && steps.pm.length === 0;

  function save() {
    const pick = (p) => ({ id: p.id, name: p.name, brand: p.brand, category: p.category, price: p.price });
    const stamp = new Date().toISOString();
    setProfile((prev) => ({
      ...prev,
      routine: { am: steps.am.map(pick), pm: steps.pm.map(pick), savedAt: stamp },
    }));
    setSavedAt(stamp);
  }

  function choose(category, id) {
    setSelection((current) => ({ ...current, [category]: id }));
    setSavedAt(null);
  }

  return (
    <div className="container page">
      <StepIndicator current={3} />

      <header className="page-head">
        <div>
          <h1>
            Build your <span className="accent">routine</span>
          </h1>
          <p>Start with the basics, then add extra steps if you want them. Changes show up straight away.</p>
        </div>
      </header>

      <div className="routine-controls">
        <div className="field">
          <span className="field-label" id="scope-label">
            Plan for
          </span>
          <Segmented
            label="Plan for"
            value={scope}
            onChange={(value) => {
              setScope(value);
              setSavedAt(null);
            }}
            options={[
              { value: "am", label: "Morning", icon: <SunIcon size={17} /> },
              { value: "pm", label: "Evening", icon: <MoonIcon size={17} /> },
              { value: "both", label: "Both" },
            ]}
          />
        </div>
        <div className="field">
          <span className="field-label">Routine size</span>
          <Segmented
            label="Routine size"
            value={depth}
            onChange={(value) => {
              setDepth(value);
              setSavedAt(null);
            }}
            options={[
              { value: "basic", label: "Basics only" },
              { value: "extras", label: "Add extra steps" },
            ]}
          />
        </div>
      </div>

      <div className="routine-layout">
        <div className="routine-pickers">
          <section className="panel" aria-labelledby="basics-heading">
            <h2 id="basics-heading" className="panel-title">
              The basics
            </h2>
            <p className="panel-sub">Cleanse, moisturise and protect. Pick a different product in any step.</p>
            <div className="picker-list">
              {basicsAvailable.map((category) => {
                const options = optionsFor(slotOptions, category);
                const chosen = chosenFor(category);
                return (
                  <div key={category} className="picker">
                    <label className="field-label" htmlFor={`pick-${category}`}>
                      {categoryMeta(category).label}
                    </label>
                    {options.length > 1 ? (
                      <select
                        id={`pick-${category}`}
                        className="select"
                        value={chosen?.id || ""}
                        onChange={(event) => choose(category, event.target.value)}
                      >
                        {options.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatPrice(p.price, p.currency)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="picker-single" id={`pick-${category}`}>
                        {chosen?.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {missingBasics.length > 0 && (
              <div className="picker-missing">
                <Notice tone="info" title={basicsAvailable.length === 0 ? "No basic steps matched" : undefined}>
                  <p>
                    No {missingBasics.map((c) => categoryMeta(c).label.toLowerCase()).join(" or ")} in the catalogue
                    matched your skin profile and filters for this time of day.
                  </p>
                  <p>
                    {depth === "basic" && extrasAvailable.length > 0 ? (
                      <>
                        <button type="button" className="text-link link-button" onClick={() => setDepth("extras")}>
                          Add extra steps
                        </button>{" "}
                        to use the products that did match, or{" "}
                      </>
                    ) : (
                      "You can "
                    )}
                    <Link to="/report" className="text-link">
                      change your filters
                    </Link>{" "}
                    on the results page.
                  </p>
                </Notice>
              </div>
            )}
          </section>

          {depth === "extras" && (
            <section className="panel" aria-labelledby="extras-heading">
              <h2 id="extras-heading" className="panel-title">
                Extra steps
              </h2>
              {extrasAvailable.length === 0 ? (
                <p className="panel-sub">No extra steps matched your filters for this time of day.</p>
              ) : (
                <ul className="extras-list">
                  {extrasAvailable.map((category) => {
                    const meta = categoryMeta(category);
                    const options = optionsFor(slotOptions, category);
                    const on = Boolean(extras[category]);
                    const chosen = chosenFor(category);
                    return (
                      <li key={category} className="extra">
                        <div className="extra-row">
                          <div>
                            <p className="extra-name" id={`extra-${category}`}>
                              {meta.label}
                            </p>
                            <p className="extra-hint">{meta.hint}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            className="switch"
                            aria-checked={on}
                            aria-labelledby={`extra-${category}`}
                            onClick={() => {
                              setExtras((current) => ({ ...current, [category]: !on }));
                              setSavedAt(null);
                            }}
                          />
                        </div>
                        {on && options.length > 1 && (
                          <select
                            className="select"
                            aria-label={`${meta.label} product`}
                            value={chosen?.id || ""}
                            onChange={(event) => choose(category, event.target.value)}
                          >
                            {options.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatPrice(p.price, p.currency)})
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="routine-result">
          <div className="routine-columns">
            {activeSlots.map((slot) => (
              <section
                key={slot}
                className={`routine-card tone-${slot === "am" ? "butter" : "mint"}`}
                aria-label={slot === "am" ? "Morning routine" : "Evening routine"}
              >
                <h2 className="routine-card-title">
                  <span className="routine-card-icon" aria-hidden="true">
                    {slot === "am" ? <SunIcon /> : <MoonIcon />}
                  </span>
                  {slot === "am" ? "Morning" : "Evening"}
                  <span className="routine-card-count">
                    {steps[slot].length} step{steps[slot].length === 1 ? "" : "s"}
                  </span>
                </h2>
                {steps[slot].length === 0 ? (
                  <p className="routine-empty">No steps yet.</p>
                ) : (
                  <ol className="routine-steps">
                    {steps[slot].map((product) => (
                      <li key={`${slot}-${product.id}`}>
                        <span className="routine-step-name">{product.name}</span>
                        <span className="routine-step-cat">{categoryMeta(product.category).label}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>

          <div className="routine-summary">
            <p>
              <strong>{uniqueProducts.size}</strong> product{uniqueProducts.size === 1 ? "" : "s"}, about{" "}
              <strong>{formatPrice(total)}</strong> in total
            </p>
            <button type="button" className="btn btn-primary" onClick={save} disabled={empty}>
              {savedAt ? (
                <>
                  <CheckIcon />
                  Saved to your profile
                </>
              ) : (
                "Save this routine"
              )}
            </button>
          </div>
          {savedAt && (
            <Notice tone="info">
              <p>
                Saved. You'll find it on your <Link to="/profile" className="text-link">profile</Link>.
              </p>
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}
