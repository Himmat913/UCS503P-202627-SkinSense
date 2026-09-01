/**
 * API client for the SkinSense backend.
 *
 * Shapes match the frozen contract in docs/planning/work-division.md §4.3.
 *
 * Data source is controlled by VITE_DATA_SOURCE:
 *   auto   (default) — try the backend; fall back to fixtures if it's unreachable
 *   api              — backend only; failures surface as errors
 *   mock             — fixtures only, never touches the network
 *
 * "auto" is what makes a demo survive a backend that isn't running yet. Every
 * fallback sets `usedMock`, and the UI shows a persistent banner when it fires —
 * fixture data is never presented as if it came from a model.
 */

import * as mock from "./mock";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const MODE = import.meta.env.VITE_DATA_SOURCE || "auto";

/** Set true the first time a request falls back. Read by <DemoBanner>. */
export const dataSource = { usedMock: false, lastError: null };

function markMock(reason) {
  dataSource.usedMock = true;
  dataSource.lastError = reason;
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

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.json();
}

/**
 * Runs the live call, falling back to the fixture in "auto" mode.
 * Only connection failures (status 0) and 404s fall back — a 400 or 500 is a
 * real bug and must not be hidden behind fixture data.
 */
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

/* ----------------------------------------------------------------- calls */

export function uploadPhoto(file) {
  const body = new FormData();
  body.append("file", file);
  // No Content-Type header — the browser sets the multipart boundary.
  return withFallback(
    () => request("/api/upload", { method: "POST", body }),
    () => mock.mockUpload(file),
  );
}

export function predictFromImage(imageId) {
  return withFallback(
    () =>
      request("/api/predict", {
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
      request("/api/predict", {
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
      request("/api/recommendations", {
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

/** GET /api/ingredients — Ansh's catalog. Not built yet; fixture for now. */
export function getIngredients() {
  return withFallback(
    () => request("/api/ingredients"),
    () => mock.mockIngredients(),
  );
}

/** POST /api/feedback — pilot clarity ratings. Not built yet; fixture for now. */
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
