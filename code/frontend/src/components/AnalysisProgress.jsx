import { useEffect, useState } from "react";

const STAGES = ["Uploading your photo", "Checking the photo", "Reading acne severity", "Saving your result"];

/**
 * Shows which stage the request is in. The real request decides when this
 * disappears; the stage text advances on a timer only to show it's working.
 */
export default function AnalysisProgress({ active }) {
  const [stage, setStage] = useState(0);
  const [wasActive, setWasActive] = useState(active);

  if (wasActive !== active) {
    setWasActive(active);
    setStage(0);
  }

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <ol className="progress-list" aria-live="polite">
      {STAGES.map((label, index) => (
        <li key={label} className={index < stage ? "is-done" : index === stage ? "is-current" : ""}>
          <span className="progress-marker" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ol>
  );
}
