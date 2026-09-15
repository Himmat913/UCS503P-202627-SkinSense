/**
 * API client for the SkinSense backend.
 *
 * Data source is controlled by VITE_DATA_SOURCE:
 *   auto   (default) — try the backend; fall back to fixtures if it's unreachable
 *   api              — backend only; failures surface as errors
 *   mock             — fixtures only, never touches the network
 *
 * Authenticated calls attach the access token automatically and retry once
 * through a silent refresh on a 401 before giving up.
 */

import * as auth from "../lib/auth";
import * as mock from "./mock";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const MODE = import.meta.env.VITE_DATA_SOURCE || "auto";

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
      return data.detail[0].msg || "Invalid request.";
    }
  } catch {
    /* no JSON body */
  }
  return `Request failed (${response.status}).`;
}

async function rawFetch(path, options) {
  try {
    return await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
}

async function refreshSession() {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return false;

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
    } else {
      auth.clearSession();
      if (onSessionExpired) onSessionExpired();
      throw new ApiError("Your session has expired. Log in again.", 401);
    }
  }

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

/**
 * Runs the live call, falling back to the fixture in "auto" mode. Only
 * connection failures (status 0) and 404s fall back — a 400 or 500 is a
 * real bug and must not be hidden behind fixture data.
 */
async function withFallback(live, fixture) {
  if (MODE === "mock") return fixture();

  try {
    return await live();
  } catch (error) {
    const notBuiltYet = error instanceof ApiError && (error.status === 0 || error.status === 404);
    if (MODE === "auto" && notBuiltYet) return fixture();
    throw error;
  }
}

/* ------------------------------------------------------------------ auth */

export async function registerUser(email, password) {
  const data = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  auth.setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: null });
  return data;
}

export async function loginUser(email, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  auth.setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: null });
  return data;
}

export async function logoutUser() {
  try {
    await request("/api/auth/logout", { method: "POST" }, { authorized: true });
  } catch {
    // Log out locally regardless of whether the server was reachable.
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
  return withFallback(
    () => request("/api/upload", { method: "POST", body }, { authorized: true }),
    () => mock.mockUpload(file),
  );
}

export function predictFromImage(imageId) {
  return withFallback(
    () =>
      request(
        "/api/predict",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_id: imageId }),
        },
        { authorized: true },
      ),
    () => mock.mockPredict(),
  );
}

export function predictManual(skinType, acneSeverity) {
  const manual = { skin_type: skinType, acne_severity: acneSeverity };
  return withFallback(
    () =>
      request(
        "/api/predict",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manual }),
        },
        { authorized: true },
      ),
    () => mock.mockPredict({ manual }),
  );
}

export function getRecommendations({ skinType, acneSeverity, allergies = [], budgetMax = null }) {
  return withFallback(
    () =>
      request(
        "/api/recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skin_type: skinType,
            acne_severity: acneSeverity,
            allergies,
            budget_max: budgetMax,
          }),
        },
        { authorized: true },
      ),
    () => mock.mockRecommendations({ allergies, budgetMax }),
  );
}

export function submitFeedback(payload) {
  return withFallback(
    () =>
      request("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    () => mock.mockFeedback(payload),
  );
}

export function checkHealth() {
  return request("/health");
}