/** A set of real radio inputs presented as selectable cards. */
export default function ChoiceCards({ name, legend, description, options, value, onChange }) {
  const descriptionId = description ? `${name}-description` : undefined;
  return (
    <fieldset className="choice-set" aria-describedby={descriptionId}>
      <legend className="field-label">{legend}</legend>
      {description && (
        <p className="field-hint" id={descriptionId}>
          {description}
        </p>
      )}
      <div className="choice-grid">
        {options.map((option) => (
          <label key={option.value} className={`choice ${value === option.value ? "is-selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-label">{option.label}</span>
            <span className="choice-hint">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
