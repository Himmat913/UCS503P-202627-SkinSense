import { Navigate, useNavigate } from "react-router-dom";

import ConfidenceMeter, { LOW_CONFIDENCE } from "../components/ConfidenceMeter";
import ModuleBadge, { ModuleNote } from "../components/ModuleBadge";
import StepIndicator from "../components/StepIndicator";
import { AlertIcon, ArrowRightIcon, RefreshIcon } from "../components/Icons";
import { useAnalysis } from "../context/AnalysisContext";

const SOURCE_LABELS = {
  model: "Analysed from photo",
  manual: "Self-reported",
  stub: "Example output",
};

function Metric({ label, value, confidence, module, children }) {
  return (
    <div className="card">
      <div className="card-header" style={{ paddingBottom: 0 }}>
        <span className="metric-label">{label}</span>
        <ModuleBadge module={module} />
      </div>
      <div className="card-body metric" style={{ paddingTop: "0.5rem" }}>
        <span className="metric-value">{value}</span>
        <ConfidenceMeter label={label} confidence={confidence} />
        {children}
      </div>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { prediction, previewUrl } = useAnalysis();

  if (!prediction) return <Navigate to="/" replace />;

  const referral = prediction.referral || { needed: false, reasons: [] };
  const tone = prediction.skin_tone;
  const lowConfidence =
    prediction.source !== "manual" &&
    (prediction.skin_type_confidence < LOW_CONFIDENCE ||
      prediction.acne_severity_confidence < LOW_CONFIDENCE);

  return (
    <>
      <StepIndicator current={2} />

      <header className="page-header">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1>Your results</h1>
          <span className={`badge ${prediction.source === "model" ? "badge-primary" : ""}`}>
            <span className="badge-dot" aria-hidden="true" />
            {SOURCE_LABELS[prediction.source] || prediction.source}
          </span>
        </div>
        <p>
          These readings drive everything that follows — the products you're shown, what's
          excluded, and the order of your routine.
        </p>
      </header>

      {referral.needed && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon">
            <AlertIcon />
          </span>
          <div className="alert-body">
            <span className="alert-title">Consider seeing a dermatologist</span>
            {referral.reasons?.length > 0 && (
              <ul>
                {referral.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <span className="text-sm">
              You can still view a routine below, but it isn't a substitute for a
              professional assessment.
            </span>
          </div>
        </div>
      )}

      {lowConfidence && (
        <div className="alert" role="status" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon">
            <RefreshIcon />
          </span>
          <div className="alert-body">
            <span className="alert-title">The model wasn't very sure</span>
            <span className="text-sm">
              A retake in brighter, even light usually helps. You can also set your skin
              type by hand instead.
            </span>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate("/")}>
                Retake photo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: "1.25rem" }}>
        <Metric
          label="Skin type"
          value={prediction.skin_type}
          confidence={prediction.skin_type_confidence}
          module="skinType"
        />
        <Metric
          label="Acne severity"
          value={prediction.acne_severity}
          confidence={prediction.acne_severity_confidence}
          module="acneSeverity"
        >
          <span className="text-sm muted">
            Hayashi bands: 1–5 mild, 6–20 moderate, more than 20 severe.
          </span>
        </Metric>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        {/* ------------------------------------------- lesion count */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <span className="metric-label">Lesion count</span>
            <ModuleBadge module="lesionCount" />
          </div>
          <div className="card-body metric" style={{ paddingTop: "0.5rem" }}>
            <span className="metric-value">
              {prediction.lesion_count_estimate ?? "—"}
            </span>
            <ModuleNote module="lesionCount" />
          </div>
        </div>

        {/* --------------------------------------------- skin tone */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <span className="metric-label">Skin tone &amp; undertone</span>
            <ModuleBadge module="skinTone" />
          </div>
          <div className="card-body metric" style={{ paddingTop: "0.5rem" }}>
            {tone ? (
              <>
                <div className="row" style={{ gap: "0.75rem" }}>
                  <span
                    className="tone-swatch"
                    style={{ backgroundColor: tone.hex }}
                    aria-hidden="true"
                  />
                  <span className="metric-value" style={{ fontSize: "1.25rem" }}>
                    {tone.undertone} · Fitzpatrick {tone.fitzpatrick}
                  </span>
                </div>
                {tone.note && <span className="text-sm muted">{tone.note}</span>}
              </>
            ) : (
              <>
                <span className="metric-value">—</span>
                <span className="text-sm muted">
                  Not detected. Skin tone is only estimated from a photo, not a manual
                  selection.
                </span>
              </>
            )}
            <ModuleNote module="skinTone" />
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-body row" style={{ gap: "1.25rem", alignItems: "flex-start" }}>
            <img src={previewUrl} alt="The photo that was analysed" className="thumb" />
            <div className="stack" style={{ gap: "0.35rem", flex: 1, minWidth: "12rem" }}>
              <span className="metric-label">Photo analysed</span>
              <span className="text-sm muted">
                Your photo is used for this analysis only. Nothing is published or shared.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => navigate("/recommendations")}
        >
          Get recommendations
          <ArrowRightIcon />
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          Try another photo
        </button>
      </div>
    </>
  );
}
