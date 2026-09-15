import { useState } from "react";

import { XIcon } from "./Icons";

export default function ChipInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function commit() {
    const next = draft.trim().toLowerCase();
    if (next && !value.includes(next)) onChange([...value, next]);
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

  function remove(chip) {
    onChange(value.filter((entry) => entry !== chip));
  }

  return (
    <div className="chip-input">
      {value.map((chip) => (
        <span className="chip" key={chip}>
          {chip}
          <button type="button" className="chip-remove" onClick={() => remove(chip)} aria-label={`Remove ${chip}`}>
            <XIcon />
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
        placeholder={value.length === 0 ? placeholder : ""}
      />
    </div>
  );
}