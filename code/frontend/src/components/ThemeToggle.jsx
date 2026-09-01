import { useState } from "react";

import { MoonIcon, SunIcon } from "./Icons";
import { getTheme, toggleTheme } from "../lib/theme";

export default function ThemeToggle() {
  // Initialised from the DOM, which the inline script in index.html already set.
  const [theme, setThemeState] = useState(getTheme);

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}
