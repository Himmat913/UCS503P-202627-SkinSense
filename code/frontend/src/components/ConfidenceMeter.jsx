const LOW_CONFIDENCE = 0.6;

/**
 * A manual selection comes back with confidence 1.0. Rendering a "100% confident"
 * bar next to something the user typed in would be misleading, so at 1.0 this
 * renders nothing.
 */
export default function ConfidenceMeter({ label, confidence }) {
  if (typeof confidence !== "number" || confidence >= 1) return null;

  const percent = Math.round(confidence * 100);
  const low = confidence < LOW_CONFIDENCE;

  return (
    <>
      <div
        className="meter"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} confidence`}
      >
        <div className={`meter-fill ${low ? "is-low" : ""}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm muted">
        {percent}% confidence{low && " — low, treat this as a rough guide"}
      </span>
    </>
  );
}

export { LOW_CONFIDENCE };
