import { Link } from "react-router-dom";

const STEPS = [
  { label: "Skin check", to: "/analyze" },
  { label: "Results", to: "/report" },
  { label: "Routine", to: "/routine" },
];

/** Where the user is in the three-step flow. Earlier steps are links back. */
export default function StepIndicator({ current }) {
  return (
    <nav className="steps" aria-label="Progress">
      <ol>
        {STEPS.map((step, index) => {
          const number = index + 1;
          const state = number === current ? "is-current" : number < current ? "is-done" : "";
          const content = (
            <>
              <span className="step-dot" aria-hidden="true">
                {number}
              </span>
              <span>{step.label}</span>
            </>
          );
          return (
            <li key={step.label} className={`step ${state}`} aria-current={number === current ? "step" : undefined}>
              {number < current ? <Link to={step.to}>{content}</Link> : <span className="step-inner">{content}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
