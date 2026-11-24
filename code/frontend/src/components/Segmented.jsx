import { useRef } from "react";

/**
 * A single-choice control built on radio semantics, so arrow keys move the
 * selection and screen readers announce "1 of 3".
 */
export default function Segmented({ label, options, value, onChange, size = "md", className = "" }) {
  const refs = useRef([]);

  function handleKeyDown(event, index) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (index + keys[event.key] + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className={`segmented segmented-${size} ${className}`} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`segmented-option ${selected ? "is-selected" : ""}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
