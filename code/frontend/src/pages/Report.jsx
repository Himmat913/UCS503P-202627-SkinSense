import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import IngredientPicker from "../components/IngredientPicker";
import ConfidenceMeter, { LOW_CONFIDENCE } from "../components/ConfidenceMeter";
import FeedbackForm from "../components/FeedbackForm";
import Notice from "../components/Notice";
import ProductCard from "../components/ProductCard";
import StepIndicator from "../components/StepIndicator";
import { ProductArt } from "../components/Art";
import { ArrowRightIcon, MoonIcon, RefreshIcon, SlidersIcon, SunIcon } from "../components/Icons";
import { getIngredientCatalog, getRecommendations } from "../api/client";
import { useAnalysis } from "../context/useAnalysis";
import { defaultRoutine } from "../lib/routine";
import { CATEGORY_ORDER, SEVERITIES, SEVERITY_NOTES, SKIN_TYPES, categoryMeta, labelFor } from "../lib/skin";

const SOURCE_TEXT = {
  model: "Read from your photo",
  manual: "You chose this",
  stub: "Estimated without the trained model, which couldn't be loaded on the server",
};

function parseBudget(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") return { value: null };
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number <= 0) return { error: "Enter a price above zero, or leave it empty for no limit." };
  return { value: Math.round(number) };
}

export default function Report() {
  const navigate = useNavigate();
  const { prediction, previewUrl, recommendations, setRecommendations, profile, setProfile } = useAnalysis();

  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);
  const [budget, setBudget] = useState(profile.budgetMax != null ? String(profile.budgetMax) : "");
  const [filterError, setFilterError] = useState(null);
  const [category, setCategory] = useState("all");
  const [ingredientInfo, setIngredientInfo] = useState(null);

  const savedAvoid = profile.avoidIngredients;
  const savedBudget = profile.budgetMax;

  useEffect(() => {
    if (!prediction || recommendations) return undefined;
    let cancelled = false;
    getRecommendations({
      skinType: prediction.skin_type,
      acneSeverity: prediction.acne_severity,
      allergies: savedAvoid || [],
      budgetMax: savedBudget ?? null,
    })
      .then((data) => {
        if (!cancelled) setRecommendations(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [prediction, recommendations, savedAvoid, savedBudget, setRecommendations]);

  useEffect(() => {
    let cancelled = false;
    getIngredientCatalog()
      .then((data) => {
        if (cancelled) return;
        const map = {};
        for (const item of data.ingredients || []) map[item.name.toLowerCase()] = item;
        setIngredientInfo(map);
      })
      .catch(() => {
        // Ingredient notes are supplementary; cards still show the engine's reasons.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(() => recommendations?.products || [], [recommendations]);

  const categories = useMemo(() => {
    const counts = {};
    for (const product of products) counts[product.category] = (counts[product.category] || 0) + 1;
    const known = CATEGORY_ORDER.filter((key) => counts[key]);
    const extra = Object.keys(counts).filter((key) => !CATEGORY_ORDER.includes(key));
    return [...known, ...extra].map((key) => ({ key, count: counts[key] }));
  }, [products]);

  if (!prediction) {
    return (
      <div className="container page">
        <div className="panel empty">
          <div className="empty-art" aria-hidden="true">
            <ProductArt category="serum" />
          </div>
          <h1>No results to show yet</h1>
          <p>Results stay on screen only until you leave or refresh the page. Run a skin check to see them.</p>
          <Link to="/analyze" className="btn btn-primary">
            Start a skin check
          </Link>
        </div>
      </div>
    );
  }

  const activeCategory = categories.some((c) => c.key === category) ? category : "all";
  const visible = activeCategory === "all" ? products : products.filter((p) => p.category === activeCategory);
  // The API returns every product that matched, which is more than a routine
  // should contain. Build the preview with the same logic the Routine page
  // uses for its starting routine, so the two always show the same steps.
  const routine = defaultRoutine(products);
  const excluded = recommendations?.excluded || [];
  const referral = prediction.referral || { needed: false, reasons: [] };
  const lowConfidence =
    (prediction.source === "model" && prediction.acne_severity_confidence < LOW_CONFIDENCE) ||
    (prediction.skin_type_source === "model" && prediction.skin_type_confidence < LOW_CONFIDENCE);
  const loading = !recommendations && !loadError;

  async function applyFilters(event) {
    event.preventDefault();
    const parsed = parseBudget(budget);
    if (parsed.error) {
      setFilterError(parsed.error);
      return;
    }
    setFilterError(null);
    setLoadError(null);
    setRefreshing(true);
    try {
      const data = await getRecommendations({
        skinType: prediction.skin_type,
        acneSeverity: prediction.acne_severity,
        allergies: avoidList,
        budgetMax: parsed.value,
      });
      setRecommendations(data);
      setProfile((prev) => ({ ...prev, avoidIngredients: avoidList, budgetMax: parsed.value }));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="page report">
      <div className="container">
        <StepIndicator current={2} />
      </div>

      <section className="container" aria-labelledby="result-heading">
        <div className="result-band">
          <div className="result-photo">
            <div className="result-arch">
              {previewUrl ? (
                <img src={previewUrl} alt="The photo that was analysed" />
              ) : (
                <ProductArt category="moisturiser" className="result-placeholder" />
              )}
            </div>
          </div>

          <div className="result-facts">
            <h1 id="result-heading">
              Your <span className="accent">results</span>
            </h1>
            <dl className="result-stats">
              <div className="stat">
                <dt>Skin type</dt>
                <dd className="stat-value">{labelFor(SKIN_TYPES, prediction.skin_type)}</dd>
                <dd>
                  <ConfidenceMeter label="Skin type" confidence={prediction.skin_type_confidence} />
                </dd>
                <dd className="stat-note">{SOURCE_TEXT[prediction.skin_type_source] || "Analysed"}</dd>
              </div>
              <div className="stat">
                <dt>Acne severity</dt>
                <dd className="stat-value">{labelFor(SEVERITIES, prediction.acne_severity)}</dd>
                <dd>
                  <ConfidenceMeter label="Acne severity" confidence={prediction.acne_severity_confidence} />
                </dd>
                <dd className="stat-note">{SOURCE_TEXT[prediction.source] || "Analysed"}</dd>
              </div>
            </dl>
            <p className="result-note">{SEVERITY_NOTES[prediction.acne_severity]}</p>
          </div>
        </div>

        {referral.needed && (
          <div className="report-notice">
            <Notice tone="warning" title="Consider seeing a dermatologist">
              {referral.reasons?.length > 0 && (
                <ul>
                  {referral.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              <p>The routine below can support your skin, but it isn't a substitute for a professional assessment.</p>
              {lowConfidence && (
                <div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate("/analyze")}>
                    <RefreshIcon />
                    Retake in brighter light
                  </button>
                </div>
              )}
            </Notice>
          </div>
        )}
      </section>

      <section className="rec-band" aria-labelledby="rec-heading">
        <div className="container">
          <div className="section-title">
            <h2 id="rec-heading" className="display-heading">
              Recommended <span className="accent">for you</span>
            </h2>
            <p>Suggestions for everyday care, not medical advice. Patch-test anything new.</p>
          </div>

          <form className="filter-bar" onSubmit={applyFilters} aria-label="Filter recommendations">
            <div className="field filter-avoid">
              <label className="field-label" htmlFor="report-avoid">
                Leave out
              </label>
              <IngredientPicker id="report-avoid" value={avoidList} onChange={setAvoidList} />
            </div>
            <div className="field filter-budget">
              <label className="field-label" htmlFor="report-budget">
                Max price per product
              </label>
              <div className="input-prefix">
                <span aria-hidden="true">₹</span>
                <input
                  id="report-budget"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="No limit"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  aria-invalid={Boolean(filterError)}
                  aria-describedby={filterError ? "budget-error" : undefined}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-outline filter-apply" disabled={refreshing || loading}>
              {refreshing ? <span className="spinner" aria-hidden="true" /> : <SlidersIcon />}
              Update picks
            </button>
            {filterError && (
              <p className="filter-error" id="budget-error" role="alert">
                {filterError}
              </p>
            )}
          </form>

          {loadError && (
            <Notice tone="error" title="Recommendations couldn't be loaded">
              <p>{loadError}</p>
            </Notice>
          )}

          {loading && (
            <div className="rec-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Matching products to your skin…
            </div>
          )}

          {recommendations && (
            <div className={`rec-layout ${refreshing ? "is-refreshing" : ""}`}>
              {products.length > 0 && (
                <nav className="rec-sidebar" aria-label="Product categories">
                  <ul>
                    <li>
                      <button
                        type="button"
                        className={`rec-cat ${activeCategory === "all" ? "is-active" : ""}`}
                        aria-pressed={activeCategory === "all"}
                        onClick={() => setCategory("all")}
                      >
                        <span>All picks</span>
                        <span className="rec-count">{products.length}</span>
                      </button>
                    </li>
                    {categories.map(({ key, count }) => (
                      <li key={key}>
                        <button
                          type="button"
                          className={`rec-cat ${activeCategory === key ? "is-active" : ""}`}
                          aria-pressed={activeCategory === key}
                          onClick={() => setCategory(key)}
                        >
                          <span>{categoryMeta(key).plural}</span>
                          <span className="rec-count">{count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className="rec-main">
                {products.length === 0 ? (
                  <div className="panel empty">
                    <h3>No products match these filters</h3>
                    {(recommendations.notes || []).map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                ) : (
                  <ul className="product-grid">
                    {visible.map((product) => (
                      <li key={product.id}>
                        <ProductCard product={product} ingredientInfo={ingredientInfo} />
                      </li>
                    ))}
                  </ul>
                )}

                {excluded.length > 0 && (
                  <details className="excluded">
                    <summary>
                      <span>
                        {excluded.length} product{excluded.length === 1 ? "" : "s"} left out, and why
                      </span>
                      <span className="faq-plus" aria-hidden="true" />
                    </summary>
                    <ul>
                      {excluded.map((item) => (
                        <li key={item.id}>
                          <span className="excluded-name">{item.name}</span>
                          <span className="excluded-reason">{item.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {recommendations && products.length > 0 && (
        <section className="container routine-preview" aria-labelledby="routine-heading">
          <div className="section-title">
            <h2 id="routine-heading" className="display-heading">
              Your daily <span className="accent">routine</span>
            </h2>
            <Link to="/routine" className="link-arrow">
              Customise it
              <ArrowRightIcon />
            </Link>
          </div>
          <div className="routine-columns">
            {[
              { key: "am", title: "Morning", icon: <SunIcon />, tone: "butter" },
              { key: "pm", title: "Evening", icon: <MoonIcon />, tone: "mint" },
            ].map((slot) => (
              <div key={slot.key} className={`routine-card tone-${slot.tone}`}>
                <h3 className="routine-card-title">
                  <span className="routine-card-icon" aria-hidden="true">
                    {slot.icon}
                  </span>
                  {slot.title}
                  <span className="routine-card-count">
                    {routine[slot.key].length} step{routine[slot.key].length === 1 ? "" : "s"}
                  </span>
                </h3>
                {routine[slot.key].length === 0 ? (
                  <p className="routine-empty">No steps for this time of day.</p>
                ) : (
                  <ol className="routine-steps">
                    {routine[slot.key].map((product) => (
                      <li key={`${slot.key}-${product.id}`}>
                        <span className="routine-step-name">{product.name}</span>
                        <span className="routine-step-cat">{categoryMeta(product.category).label}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>

          <p className="routine-preview-note">
            These are the three essential steps. Add a toner, serum or treatment on the next page.
          </p>

          <div className="routine-cta">
            <Link to="/routine" className="btn btn-primary">
              Build my routine
              <ArrowRightIcon />
            </Link>
          </div>
        </section>
      )}

      {recommendations && (
        <section className="container">
          <div className="panel feedback-panel">
            <FeedbackForm prediction={prediction} recommendations={recommendations} />
          </div>
        </section>
      )}
    </div>
  );
}
