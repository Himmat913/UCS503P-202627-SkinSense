import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import ModuleBadge, { ModuleNote } from "../components/ModuleBadge";
import StepIndicator from "../components/StepIndicator";
import { AlertIcon, ArrowRightIcon, InfoIcon, RefreshIcon } from "../components/Icons";
import { getRecommendations } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

function parseAllergies(raw) {
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function RoutineList({ title, ids, productsById }) {
  if (!ids || ids.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
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
              {product?.category && (
                <span className="routine-category">{product.category}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Recommendations() {
  const navigate = useNavigate();
  const { prediction, recommendations, setRecommendations, profile } = useAnalysis();

  const [allergyInput, setAllergyInput] = useState(
    profile.allergies?.join(", ") || "",
  );
  const [budgetInput, setBudgetInput] = useState(
    profile.budgetMax != null ? String(profile.budgetMax) : "",
  );
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [prediction, setRecommendations],
  );

  useEffect(() => {
    if (prediction && !recommendations) {
      load(profile.allergies || [], profile.budgetMax ?? null);
    }
  }, [prediction, recommendations, load, profile]);

  if (!prediction) return <Navigate to="/" replace />;

  const products = recommendations?.products || [];
  const excluded = recommendations?.excluded || [];
  const routine = recommendations?.routine || { am: [], pm: [] };
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  return (
    <>
      <StepIndicator current={3} />

      <header className="page-header">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1>Your routine</h1>
          <div className="row" style={{ gap: "0.4rem" }}>
            <ModuleBadge module="recommendations" />
            {recommendations?.engine_version && (
              <span className="badge font-mono">{recommendations.engine_version}</span>
            )}
          </div>
        </div>
        <p>
          Built for <strong>{prediction.skin_type}</strong> skin with{" "}
          <strong>{prediction.acne_severity}</strong> acne. Every product below says why it
          was picked, and anything filtered out says why it was dropped.
        </p>
      </header>

      {/* ------------------------------------------------------- filters */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
          <ModuleBadge module="allergyFilter" />
        </div>
        <div className="card-body">
          <div className="grid-2" style={{ alignItems: "end" }}>
            <div className="field">
              <label className="label" htmlFor="allergies">
                Ingredients to avoid
              </label>
              <input
                id="allergies"
                className="input"
                placeholder="fragrance, salicylic acid"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
              />
              <span className="hint">
                Separate with commas.{" "}
                <Link to="/profile" className="link">
                  Save to your profile
                </Link>{" "}
                so you don't re-enter them.
              </span>
            </div>
            <div className="field">
              <label className="label" htmlFor="budget">
                Maximum price per product (₹)
              </label>
              <input
                id="budget"
                className="input"
                type="number"
                min="0"
                step="50"
                placeholder="No limit"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ marginTop: "1rem" }}
            disabled={loading}
            onClick={() =>
              load(
                parseAllergies(allergyInput),
                budgetInput.trim() === "" ? null : Number(budgetInput),
              )
            }
          >
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
          {/* ------------------------------------------------ products */}
          <section>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2>Recommended products</h2>
              <span className="text-sm muted">{products.length} matched</span>
            </div>
            <div className="card">
              {products.length === 0 ? (
                <div className="empty">
                  <p>No products matched these filters.</p>
                  <p className="text-sm">Try raising the budget or removing an ingredient.</p>
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
                          {product.key_ingredients.map((ing) => (
                            <span key={ing} className="badge" style={{ fontSize: "0.6875rem" }}>
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                      {product.reasons?.length > 0 && (
                        <ul className="reasons">
                          {product.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="product-price">
                      {product.price != null ? `₹${product.price}` : "—"}
                    </span>
                  </article>
                ))
              )}
            </div>
            <ModuleNote module="recommendations" />
          </section>

          {/* ------------------------------------------------- routine */}
          <section>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2>Daily routine</h2>
              <ModuleBadge module="routine" />
            </div>
            <div className="grid-2">
              <RoutineList title="☀ Morning" ids={routine.am} productsById={productsById} />
              <RoutineList title="🌙 Evening" ids={routine.pm} productsById={productsById} />
            </div>
            <ModuleNote module="routine" />
          </section>

          {/* ------------------------------------------------ conflicts */}
          <section>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2>Ingredient conflicts checked</h2>
              <ModuleBadge module="conflicts" />
            </div>
            <div className="alert">
              <span className="alert-icon muted"><InfoIcon /></span>
              <div className="alert-body">
                <span className="text-sm muted">
                  Conflicting ingredients (e.g. retinol + salicylic acid) are separated
                  across morning and evening or excluded entirely. See the{" "}
                  <Link to="/ingredients" className="link">
                    Ingredients
                  </Link>{" "}
                  page for the full conflict table.
                </span>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ excluded */}
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/feedback")}
            >
              Rate these results
              <ArrowRightIcon />
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate("/results")}>
              Back to results
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
              Start over
            </button>
          </div>
        </div>
      )}
    </>
  );
}
