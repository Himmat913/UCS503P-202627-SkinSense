/**
 * Auth session storage. Plain module state so api/client.js can read and
 * write it directly; AuthContext.jsx is a thin React wrapper around it.
 */

const STORAGE_KEY = "skinsense-auth";

let state = { accessToken: null, refreshToken: null, user: null };
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {
    // Corrupt or inaccessible storage: start logged out.
  }
}
load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the session still works for this tab.
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

export function clearSession() {
  state = { accessToken: null, refreshToken: null, user: null };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
  notify();
}

/**
 * The account id the current token was issued for. Used only to keep
 * locally saved preferences separate between accounts on a shared browser;
 * the server still verifies every token itself.
 */
export function userIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const sub = JSON.parse(json).sub;
    return sub ? String(sub) : null;
  } catch {
    return null;
  }
}
