import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "./useAuth";
import { AnalysisContext } from "./contexts";

/**
 * State shared across one skin check.
 *
 * The scan itself (prediction, recommendations, photo preview) lives in
 * memory only: restoring a stale result after a reload would be worse than
 * starting fresh. The skin profile (ingredients to avoid, budget, saved
 * routine, last result) is a standing preference, so it is saved in this
 * browser, separately for each account.
 */

const PROFILE_PREFIX = "skinsense-profile:";
const LEGACY_SHARED_KEY = "skinsense-profile";

const EMPTY_PROFILE = {
  avoidIngredients: [],
  budgetMax: null,
  notes: "",
  lastSkinType: null,
  lastSeverity: null,
  routine: null,
};

function loadProfile(userId) {
  try {
    localStorage.removeItem(LEGACY_SHARED_KEY);
    if (!userId) return EMPTY_PROFILE;
    const raw = localStorage.getItem(PROFILE_PREFIX + userId);
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

export function AnalysisProvider({ children }) {
  const { userId } = useAuth();

  const [ownerId, setOwnerId] = useState(userId);
  const [profile, setProfile] = useState(() => loadProfile(userId));
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoMeta, setPhotoMeta] = useState(null);

  if (ownerId !== userId) {
    setOwnerId(userId);
    setProfile(loadProfile(userId));
    setPrediction(null);
    setRecommendations(null);
    setPreviewUrl(null);
    setPhotoMeta(null);
  }

  useEffect(() => {
    if (!ownerId) return;
    try {
      localStorage.setItem(PROFILE_PREFIX + ownerId, JSON.stringify(profile));
    } catch {
      // Storage unavailable: preferences still apply for this session.
    }
  }, [ownerId, profile]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const reset = useCallback(() => {
    setPrediction(null);
    setRecommendations(null);
    setPreviewUrl(null);
    setPhotoMeta(null);
  }, []);

  const value = useMemo(
    () => ({
      prediction,
      setPrediction,
      recommendations,
      setRecommendations,
      previewUrl,
      setPreviewUrl,
      photoMeta,
      setPhotoMeta,
      profile,
      setProfile,
      reset,
    }),
    [prediction, recommendations, previewUrl, photoMeta, profile, reset],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}
