export const LOW_CONFIDENCE = 0.6;

/**
 * Model confidence for one prediction. A value of 1.0 means the user chose
 * the answer themselves, so no meter is shown: a "100% confident" bar next
 * to a self-reported answer would be misleading.
 */
export default function ConfidenceMeter({ label, confidence }) {
  if (typeof confidence !== "number" || confidence >= 1) return null;

  const percent = Math.round(confidence * 100);
  const low = confidence < LOW_CONFIDENCE;

  return (
    <div className="confidence">
      <div
        className="meter"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} confidence`}
      >
        <div className={`meter-fill ${low ? "is-low" : ""}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="confidence-text">
        Model confidence {percent}%{low ? ", low, so treat this as a rough guide" : ""}
      </p>
    </div>
  );
}
