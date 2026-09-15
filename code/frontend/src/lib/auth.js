/** Auth session storage — plain module state so api/client.js can read/write
 * it directly. AuthContext.jsx is a thin React wrapper around this. */

const STORAGE_KEY = "skinsense-auth";

let state = { accessToken: null, refreshToken: null, user: null };
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {
    // Corrupt or inaccessible storage — start logged out.
  }
}
load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — session still works for this tab.
  }
}

function notify() {
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function getAccessToken() {
  return state.accessToken;
}

export function getRefreshToken() {
  return state.refreshToken;
}

export function setSession({ accessToken, refreshToken, user }) {
  state = { accessToken, refreshToken, user };
  persist();
  notify();
}

export function setAccessToken(accessToken) {
  state = { ...state, accessToken };
  persist();
  notify();
}

export function clearSession() {
  state = { accessToken: null, refreshToken: null, user: null };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  notify();
}

export function isLoggedIn() {
  return Boolean(state.accessToken);
}