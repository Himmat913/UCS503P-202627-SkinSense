import { useEffect, useId, useMemo, useRef, useState } from "react";

import { XIcon } from "./Icons";
import { getIngredientCatalog } from "../api/client";
import { titleCase } from "../lib/skin";

/**
 * Picks ingredients to exclude from a list of what the catalogue actually
 * contains. Free typing is deliberately not allowed: an ingredient that
 * isn't in the database would filter nothing and look broken.
 */
export default function IngredientPicker({ id, value, onChange, describedBy }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    let cancelled = false;
    getIngredientCatalog()
      .then((data) => {
        if (cancelled) return;
        const names = (data.ingredients || [])
          .map((item) => ({ name: item.name.toLowerCase(), role: item.role || "" }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCatalog(names);
      })
      .catch(() => setCatalog([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const matches = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog
      .filter((item) => !value.includes(item.name) && (needle === "" || item.name.includes(needle)))
      .slice(0, 8);
  }, [catalog, query, value]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function add(name) {
    if (!value.includes(name)) onChange([...value, name]);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Backspace" && query === "" && value.length > 0) {
      onChange(value.slice(0, -1));
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + matches.length) % Math.max(matches.length, 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && matches[active]) add(matches[active].name);
      return;
    }
    if (event.key === "Escape") setOpen(false);
  }

  const unavailable = catalog !== null && catalog.length === 0;

  return (
    <div className="picker-wrap" ref={wrapRef}>
      <div className="chip-input">
        {value.map((chip) => (
          <span className="chip" key={chip}>
            <span className="chip-text">{chip}</span>
            <button
              type="button"
              className="chip-remove"
              onClick={() => onChange(value.filter((entry) => entry !== chip))}
              aria-label={`Stop excluding ${chip}`}
            >
              <XIcon size={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="chip-field"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={describedBy}
          autoComplete="off"
          value={query}
          disabled={catalog === null}
          placeholder={
            catalog === null
              ? "Loading ingredients…"
              : value.length === 0
                ? "Search ingredients, e.g. fragrance"
                : "Add another"
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && !unavailable && (
        <ul className="picker-menu" id={listId} role="listbox">
          {matches.length === 0 ? (
            <li className="picker-empty">
              {query.trim() ? `No ingredient matching “${query.trim()}”` : "All ingredients are already excluded"}
            </li>
          ) : (
            matches.map((item, index) => (
              <li key={item.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`picker-option ${index === active ? "is-active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => add(item.name)}
                >
                  <span className="picker-option-name">{titleCase(item.name)}</span>
                  {item.role && <span className="picker-option-role">{item.role}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
