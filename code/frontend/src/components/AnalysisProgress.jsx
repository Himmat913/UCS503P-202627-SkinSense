import { useEffect, useState } from "react";

/**
 * Staged progress during analysis.
 *
 * The proposal's stretch goal is a task queue with a polled status endpoint;
 * this is the UI that will consume it. Until then the stages advance on a timer,
 * which is honest for a demo and becomes real the day polling lands.
 */
const STAGES = [
  "Checking the photo",
  "Detecting the face",
  "Assessing skin type",
  "Grading acne severity",
  "Matching products",
];

export default function AnalysisProgress({ active }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 450);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <ul className="progress-stages" aria-live="polite">
      {STAGES.map((label, index) => (
        <li
          key={label}
          className={index < stage ? "is-done" : index === stage ? "is-active" : ""}
        >
          <span className="progress-marker" aria-hidden="true">
            {index < stage ? "✓" : "•"}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
