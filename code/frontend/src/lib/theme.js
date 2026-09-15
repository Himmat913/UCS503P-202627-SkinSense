/** Dark-mode state. The initial class is applied by an inline script in
 * index.html before React mounts; this module only reads and changes it. */

const STORAGE_KEY = "skinsense-theme";

export function getTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable — theme still applies for this session.
  }
  return theme;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}