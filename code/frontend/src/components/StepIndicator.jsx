const STEPS = ["Photo", "Analysis", "Products", "Routine"];

/** @param {{ current: 1 | 2 | 3 | 4 }} props */
export default function StepIndicator({ current }) {
  return (
    <nav className="steps" aria-label="Progress">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const state = step === current ? "is-active" : step < current ? "is-done" : "";

        return (
          <div key={label} style={{ display: "contents" }}>
            <span className={`step ${state}`} aria-current={step === current ? "step" : undefined}>
              <span className="step-num">{step < current ? "✓" : step}</span>
              {label}
            </span>
            {step < STEPS.length && <span className="step-line" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}
