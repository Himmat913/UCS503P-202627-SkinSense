import { useState } from "react";

import { XIcon } from "./Icons";

export default function ChipInput({ id, value, onChange, placeholder, describedBy }) {
  const [draft, setDraft] = useState("");

  function commit() {
    const entries = draft
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const next = [...value];
    for (const entry of entries) {
      if (!next.includes(entry)) next.push(entry);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="chip-input">
      {value.map((chip) => (
        <span className="chip" key={chip}>
          <span className="chip-text">{chip}</span>
          <button
            type="button"
            className="chip-remove"
            onClick={() => onChange(value.filter((entry) => entry !== chip))}
            aria-label={`Remove ${chip}`}
          >
            <XIcon size={14} />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="chip-field"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : "Add another"}
        aria-describedby={describedBy}
        autoComplete="off"
      />
    </div>
  );
}
