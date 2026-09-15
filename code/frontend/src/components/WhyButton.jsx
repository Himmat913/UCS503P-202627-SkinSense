import { useState } from "react";

import { HelpCircleIcon } from "./Icons";

export default function WhyButton({ reasons }) {
  const [open, setOpen] = useState(false);
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className="why">
      <button
        type="button"
        className={`why-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <HelpCircleIcon />
        Why this?
      </button>
      {open && (
        <ul className="why-panel">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}