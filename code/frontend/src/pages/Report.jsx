import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import ChipInput from "../components/ChipInput";
import ConfidenceMeter, { LOW_CONFIDENCE } from "../components/ConfidenceMeter";
import StepIndicator from "../components/StepIndicator";
import WhyButton from "../components/WhyButton";
import { AlertIcon, ArrowRightIcon, InfoIcon, RefreshIcon } from "../components/Icons";
import { getRecommendations } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

const SOURCE_LABELS = { model: "From your photo", manual: "Self-reported" };

export default function Report() {
  const navigate = useNavigate();
  const { prediction, previewUrl, recommendations, setRecommendations, profile, setProfile } = useAnalysis();

  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);
  const [budgetInput, setBudgetInput] = useState(profile.budgetMax != null ? String(profile.budgetMax) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (allergies, budgetMax) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRecommendations({
          skinType: prediction.skin_type,
          acneSeverity: prediction.acne_severity,
          allergies,
          budgetMax,
        });
        setRecommendations(data);
        setProfile((prev) => ({ ...prev, avoidIngredients: allergies, budgetMax }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [prediction, setRecommendations, setProfile],
  );

  useEffect(() => {
    if (prediction && !recommendations) {
      load(profile.avoidIngredients || [], profile.budgetMax ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction]);

  if (!prediction) return <Navigate to="/" replace />;

  const referral = prediction.referral || { needed: false, reasons: [] };
  const lowConfidence = prediction.source !== "manual" && prediction.acne_severity_confidence < LOW_CONFIDENCE;

  const products = recommendations?.products || [];
  const excluded = recommendations?.excluded || [];
  const routine = recommendations?.routine || { am: [], pm: [] };
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  function applyFilters() {
    load(avoidList, budgetInput.trim() === "" ? null : Number(budgetInput));
  }

  return (
    <>
      <StepIndicator current={2} />

      <header className="page-header enter">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1>Your report</h1>
          <span className={`badge ${prediction.source === "model" ? "badge-primary" : ""}`}>
            <span className="badge-dot" aria-hidden="true" />
            {SOURCE_LABELS[prediction.source] || "Analysed"}
          </span>
        </div>
        <p>
          Every product below says why it was picked. Conflicting ingredients are
          automatically separated across morning and evening, or excluded outright.
        </p>
      </header>

      {referral.needed && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon"><AlertIcon /></span>
          <div className="alert-body">
            <span className="alert-title">Consider seeing a dermatologist</span>
            {referral.reasons?.length > 0 && (
              <ul>
                {referral.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <span className="text-sm">You can still use a routine below, but it isn't a substitute for a professional assessment.</span>
          </div>
        </div>
      )}

      {lowConfidence && (
        <div className="alert" role="status" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon"><RefreshIcon /></span>
          <div className="alert-body">
            <span className="alert-title">We weren't very sure about this one</span>
            <span className="text-sm">A retake in brighter, even light usually helps.</span>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate("/")}>
                Retake photo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        <div className="card stat-card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <span className="metric-label">Skin type</span>
          </div>
          <div className="card-body metric" style={{ paddingTop: "0.5rem" }}>
            <span className="metric-value">{prediction.skin_type}</span>
            <ConfidenceMeter label="Skin type" confidence={prediction.skin_type_confidence} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <span className="metric-label">Acne severity</span>
          </div>
          <div className="card-body metric" style={{ paddingTop: "0.5rem" }}>
            <span className="metric-value">{prediction.acne_severity}</span>
            <ConfidenceMeter label="Acne severity" confidence={prediction.acne_severity_confidence} />
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-body row" style={{ gap: "1.25rem", alignItems: "flex-start" }}>
            <img src={previewUrl} alt="The photo that was analysed" className="thumb" />
            <div className="stack" style={{ gap: "0.35rem", flex: 1, minWidth: "12rem" }}>
              <span className="metric-label">Photo analysed</span>
              <span className="text-sm muted">Used for this analysis only — nothing is published or shared.</span>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
        </div>
        <div className="card-body">
          <div className="grid-2" style={{ alignItems: "end" }}>
            <div className="field">
              <label className="label" htmlFor="report-avoid">Ingredients or products to avoid</label>
              <ChipInput id="report-avoid" value={avoidList} onChange={setAvoidList} placeholder="fragrance, salicylic acid…" />
            </div>
            <div className="field">
              <label className="label" htmlFor="report-budget">Maximum price per product (₹)</label>
              <input
                id="report-budget"
                className="input"
                type="number"
                min="0"
                step="50"
                placeholder="No limit"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
              />
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: "1rem" }} disabled={loading} onClick={applyFilters}>
            <RefreshIcon />
            Apply filters
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon"><AlertIcon /></span>
          <div className="alert-body">
            <span className="alert-title">Couldn't load recommendations</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && !recommendations && (
        <div className="card">
          <div className="empty">
            <span className="spinner" aria-hidden="true" style={{ margin: "0 auto 0.75rem" }} />
            <div>Matching products…</div>
          </div>
        </div>
      )}

      {recommendations && (
        <div className="stack-lg">
          <section>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2>Recommended products</h2>
              <span className="text-sm muted">{products.length} matched</span>
            </div>
            <div className="card">
              {products.length === 0 ? (
                <div className="empty">
                  <p>No products matched these filters.</p>
                  <p className="text-sm">Try raising the budget or removing something from your avoid list.</p>
                </div>
              ) : (
                products.map((product) => (
                  <article className="product" key={product.id}>
                    <div className="product-main">
                      <div className="row" style={{ gap: "0.5rem" }}>
                        <span className="product-name">{product.name}</span>
                        <span className="badge badge-outline">{product.category}</span>
                      </div>
                      <span className="product-brand">{product.brand}</span>
                      {product.key_ingredients?.length > 0 && (
                        <div className="row" style={{ gap: "0.35rem", marginTop: "0.15rem" }}>
                          {product.key_ingredients.map((ingredient) => (
                            <span key={ingredient} className="badge" style={{ fontSize: "0.6875rem" }}>
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      )}
                      <WhyButton reasons={product.reasons} />
                    </div>
                    <span className="product-price">{product.price != null ? `₹${product.price}` : "—"}</span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2>Daily routine</h2>
            </div>
            <div className="grid-2">
              <RoutineList title="Morning" ids={routine.am} productsById={productsById} />
              <RoutineList title="Evening" ids={routine.pm} productsById={productsById} />
            </div>
          </section>

          {excluded.length > 0 && (
            <section>
              <h2 style={{ marginBottom: "0.75rem" }}>Excluded, and why</h2>
              <div className="card">
                {excluded.map((item) => (
                  <div className="product" key={item.id}>
                    <div className="product-main">
                      <span className="product-name">{item.name}</span>
                      <span className="product-brand">{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recommendations.notes?.length > 0 && (
            <div className="alert">
              <span className="alert-icon muted"><InfoIcon /></span>
              <div className="alert-body">
                {recommendations.notes.map((note) => (
                  <span key={note} className="text-sm">{note}</span>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => navigate("/routine")}>
              Build my AM/PM routine
              <ArrowRightIcon />
            </button>
            <Link to="/feedback" className="btn btn-outline">Rate these results</Link>
            <Link to="/" className="btn btn-ghost">Start over</Link>
          </div>
        </div>
      )}
    </>
  );
}

function RoutineList({ title, ids, productsById }) {
  if (!ids || ids.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><h3 className="card-title">{title}</h3></div>
        <div className="card-body muted text-sm">No steps for this part of the day.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className="badge">{ids.length} steps</span>
      </div>
      <div className="card-body" style={{ paddingBlock: "0.25rem" }}>
        {ids.map((id, index) => {
          const product = productsById[id];
          return (
            <div className="routine-step" key={`${id}-${index}`}>
              <span className="routine-order">{index + 1}</span>
              <span>{product ? product.name : id}</span>
              {product?.category && <span className="routine-category">{product.category}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}