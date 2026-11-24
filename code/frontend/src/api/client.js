/**
 * API client for the SkinSense backend.
 *
 * Every call goes to the real FastAPI server at VITE_API_BASE_URL. There is
 * no fixture fallback: if the server can't be reached the caller gets an
 * ApiError with status 0 and a message saying so, never made-up data.
 *
 * Authenticated calls attach the access token and retry once through a
 * silent refresh on a 401 before ending the session.
 */

import * as auth from "../lib/auth";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let onSessionExpired = null;

export function setOnSessionExpired(callback) {
  onSessionExpired = callback;
}

async function readError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const message = data.detail[0].msg || "That request wasn't valid.";
      return message.replace(/^Value error, /, "");
    }
  } catch {
    // The body wasn't JSON; fall through to a status-based message.
  }
  if (response.status >= 500) return "The server ran into a problem. Try again in a moment.";
  return `Request failed (${response.status}).`;
}

async function rawFetch(path, options) {
  try {
    return await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(
      "Can't reach the SkinSense server. Check that the backend is running, then try again.",
      0,
    );
  }
}

let refreshInFlight = null;

function refreshSession() {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await rawFetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      auth.setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: auth.getState().user,
      });
      return true;
    })()
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request(path, options = {}, { authorized = false } = {}) {
  const headers = { ...(options.headers || {}) };
  if (authorized) {
    const token = auth.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response = await rawFetch(path, { ...options, headers });

  if (authorized && response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      headers.Authorization = `Bearer ${auth.getAccessToken()}`;
      response = await rawFetch(path, { ...options, headers });
    }
    if (!refreshed || response.status === 401) {
      auth.clearSession();
      if (onSessionExpired) onSessionExpired();
      throw new ApiError("Your session has expired. Log in again to continue.", 401);
    }
  }

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

function jsonBody(payload) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

/* ------------------------------------------------------------------ auth */

export async function registerUser(email, password) {
  const data = await request("/api/auth/register", jsonBody({ email, password }));
  auth.setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: null });
  return data;
}

export async function loginUser(email, password) {
  const data = await request("/api/auth/login", jsonBody({ email, password }));
  auth.setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: null });
  return data;
}

export async function logoutUser() {
  try {
    await request("/api/auth/logout", { method: "POST" }, { authorized: true });
  } catch {
    // The local session is cleared below whether or not the server answered.
  }
  auth.clearSession();
}

export async function fetchMe() {
  const user = await request("/api/auth/me", {}, { authorized: true });
  auth.setSession({ accessToken: auth.getAccessToken(), refreshToken: auth.getRefreshToken(), user });
  return user;
}

/* -------------------------------------------------------------- analysis */

export function uploadPhoto(file) {
  const body = new FormData();
  body.append("file", file);
  return request("/api/upload", { method: "POST", body }, { authorized: true });
}

/**
 * skinType is optional: omit it (or pass null/undefined) to let the server's skin-type
 * model read it from the photo. The server responds 409 if no model is available right
 * now — callers should catch that and resubmit with an explicit skinType.
 */
export function predictFromImage(imageId, skinType = null) {
  return request("/api/predict", jsonBody({ image_id: imageId, skin_type: skinType || null }), {
    authorized: true,
  });
}

export function predictManual(skinType, acneSeverity) {
  return request(
    "/api/predict",
    jsonBody({ manual: { skin_type: skinType, acne_severity: acneSeverity } }),
    { authorized: true },
  );
}

export function getProgress() {
  return request("/api/progress", {}, { authorized: true });
}

export function getAnalysisHistory(limit = 20) {
  return request(`/api/analyses?limit=${encodeURIComponent(limit)}`, {}, { authorized: true });
}

/* ------------------------------------------------------ recommendations */

export const MAX_RECOMMENDED_PRODUCTS = 20;

export function getRecommendations({ skinType, acneSeverity, allergies = [], budgetMax = null }) {
  return request(
    "/api/recommendations",
    jsonBody({
      skin_type: skinType,
      acne_severity: acneSeverity,
      allergies,
      budget_max: budgetMax,
      max_products: MAX_RECOMMENDED_PRODUCTS,
    }),
    { authorized: true },
  );
}

let ingredientCatalogPromise = null;

/** Public reference data; fetched once per page load and shared. */
export function getIngredientCatalog() {
  if (!ingredientCatalogPromise) {
    ingredientCatalogPromise = request("/api/ingredients").catch((error) => {
      ingredientCatalogPromise = null;
      throw error;
    });
  }
  return ingredientCatalogPromise;
}

/* -------------------------------------------------------------- feedback */

export function submitFeedback(payload) {
  return request("/api/feedback", jsonBody(payload), { authorized: true });
}
