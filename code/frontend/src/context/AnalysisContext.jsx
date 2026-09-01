import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Shared state across the flow.
 *
 * The analysis itself (prediction, recommendations, preview) is in memory only —
 * a stale prediction restored after a reload would be worse than none.
 *
 * The skin profile (allergies, budget) IS persisted, because it's a stable fact
 * about the user rather than the result of one scan.
 */

const AnalysisContext = createContext(null);
const PROFILE_KEY = "skinsense-profile";

const EMPTY_PROFILE = { allergies: [], budgetMax: null, notes: "" };

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

export function AnalysisProvider({ children }) {
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [profile, setProfile] = useState(loadProfile);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Storage unavailable — the profile still works for this session.
    }
  }, [profile]);

  const reset = useCallback(() => {
    setPrediction(null);
    setRecommendations(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      prediction,
      setPrediction,
      recommendations,
      setRecommendations,
      previewUrl,
      setPreviewUrl,
      profile,
      setProfile,
      reset,
    }),
    [prediction, recommendations, previewUrl, profile, reset],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error("useAnalysis must be used inside <AnalysisProvider>.");
  return context;
}
