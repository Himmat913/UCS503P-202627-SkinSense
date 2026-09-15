/**
 * API client for the SkinSense backend.
 *
 * VITE_DATA_SOURCE controls the data source:
 *   auto   (default) — try the backend; fall back to fixtures if unreachable
 *   api              — backend only; failures surface as errors
 *   mock             — fixtures only, never touches the network
 *
 * Auth endpoints are never mocked, even in "auto" mode — a fake session is
 * misleading in a way stub product data isn't.
 */

import * as mock from "./mock";
import * as auth from "../lib/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const MODE = import.meta.env.VITE_DATA_SOURCE || "auto";

export const dataSource = { usedMock: false, lastError: null };

function markMock(reason) {
  dataSource.usedMock = true;
  dataSource.lastError = reason;
}

let onSessionExpired = () => {};
export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

async function rawRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function request(path, options = {}) {
  return rawRequest(path, options);
}

async function authedRequest(path, options = {}) {
  const attempt = () => {
    const token = auth.getAccessToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return rawRequest(path, { ...options, headers });
  };

  if (!auth.getAccessToken()) {
    throw new ApiError("Not logged in.", 401);
  }

  try {
    return await attempt();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    const refreshToken = auth.getRefreshToken();
    if (!refreshToken) {
      auth.clearSession();
      onSessionExpired();
      throw error;
    }

    try {
      const refreshed = await rawRequest("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      auth.setSession({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        user: auth.getState().user,
      });
    } catch {
      auth.clearSession();
      onSessionExpired();
      throw error;
    }

    return attempt();
  }
}

async function withFallback(live, fixture) {
  if (MODE === "mock") {
    markMock("Running in fixture mode.");
    return fixture();
  }

  try {
    return await live();
  } catch (error) {
    const notBuiltYet = error instanceof ApiError && (error.status === 0 || error.status === 404);
    if (MODE === "auto" && notBuiltYet) {
      markMock(
        error.status === 404 ? "This endpoint isn't built yet." : "The backend isn't running.",
      );
      return fixture();
    }
    throw error;
  }
}

export async function registerUser(email, password) {
  const result = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  auth.setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, user: { email } });
  return result;
}

export async function loginUser(email, password) {
  const result = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  auth.setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, user: { email } });
  return result;
}

export async function logoutUser() {
  try {
    await authedRequest("/api/auth/logout", { method: "POST" });
  } finally {
    auth.clearSession();
  }
}

export async function fetchMe() {
  const user = await authedRequest("/api/auth/me");
  auth.setSession({ accessToken: auth.getAccessToken(), refreshToken: auth.getRefreshToken(), user });
  return user;
}

export function uploadPhoto(file) {
  const body = new FormData();
  body.append("file", file);
  return withFallback(
    () => authedRequest("/api/upload", { method: "POST", body }),
    () => mock.mockUpload(file),
  );
}

export function predictFromImage(imageId) {
  return withFallback(
    () =>
      authedRequest("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId }),
      }),
    () => mock.mockPredict(),
  );
}

export function predictManual(skinType, acneSeverity) {
  const manual = { skin_type: skinType, acne_severity: acneSeverity };
  return withFallback(
    () =>
      authedRequest("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual }),
      }),
    () => mock.mockPredict({ manual }),
  );
}

export function getRecommendations({ skinType, acneSeverity, allergies = [], budgetMax = null }) {
  return withFallback(
    () =>
      authedRequest("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skin_type: skinType,
          acne_severity: acneSeverity,
          allergies,
          budget_max: budgetMax,
        }),
      }),
    () => mock.mockRecommendations({ allergies, budgetMax }),
  );
}

export function getIngredients() {
  return withFallback(
    () => request("/api/ingredients"),
    () => mock.mockIngredients(),
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