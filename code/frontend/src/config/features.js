/**
 * Single source of truth for what is actually built.
 *
 * Every module in the proposal appears here. The UI reads `status` to decide
 * whether to show a "Preview" or "Planned" badge, so a demo can walk the whole
 * feature set without anyone mistaking fixture output for a working model.
 *
 * Update the status string as each module lands — nothing else needs changing.
 *
 *   live    — real implementation, wired end to end
 *   stub    — endpoint exists, returns placeholder data
 *   planned — no backend at all yet; the page runs on fixtures
 */

export const STATUS = {
  live: { label: "Live", tone: "live" },
  stub: { label: "Preview", tone: "stub" },
  planned: { label: "Planned", tone: "planned" },
};

export const MODULES = {
  photoValidation: {
    name: "Photo validation",
    status: "stub",
    owner: "Muskan",
    note: "MediaPipe face count, head pose, brightness and blur checks land in W6.",
  },
  skinType: {
    name: "Skin type classification",
    status: "planned",
    owner: "Muskan",
    note: "MobileNetV2 transfer learning, 3 classes. Dataset collection in progress.",
  },
  acneSeverity: {
    name: "Acne severity classification",
    status: "planned",
    owner: "Himant",
    note: "ResNet-50 on ACNE04, 3 severity bands by lesion count.",
  },
  lesionCount: {
    name: "Lesion count estimate",
    status: "planned",
    owner: "Himant",
    note: "Second regression head, decoupled from the severity classifier.",
  },
  skinTone: {
    name: "Skin tone & undertone",
    status: "planned",
    owner: "Muskan",
    note: "Lightweight colour analysis to refine sunscreen suitability.",
  },
  recommendations: {
    name: "Recommendation engine",
    status: "stub",
    owner: "Ansh",
    note: "Deterministic rule matching against the product catalog.",
  },
  routine: {
    name: "AM/PM routine builder",
    status: "planned",
    owner: "Ansh",
    note: "Canonical step ordering with conflict-aware splitting across the day.",
  },
  allergyFilter: {
    name: "Allergy exclusion filter",
    status: "stub",
    owner: "Ansh",
    note: "Hard filter — a flagged ingredient must never reach a recommendation.",
  },
  conflicts: {
    name: "Ingredient conflict rules",
    status: "stub",
    owner: "Ansh",
    note: "Sourced conflict pairs, each with a documented reason.",
  },
  referral: {
    name: "Dermatologist referral flag",
    status: "live",
    owner: "Himant",
    note: "Triggers on severe acne, low confidence, or a failed photo check.",
  },
  feedback: {
    name: "Pilot feedback capture",
    status: "planned",
    owner: "Ansh",
    note: "1–5 clarity rating plus open comments, for the W15 pilot.",
  },
};

/** Evaluation targets from the proposal, alongside where we actually are. */
export const EVALUATION = [
  { metric: "Skin type accuracy", target: "≥ 80%", current: "Not yet trained" },
  { metric: "Acne severity accuracy", target: "≥ 80% (floor 70%)", current: "Not yet trained" },
  { metric: "Acne severity macro-F1", target: "Reported alongside accuracy", current: "Not yet trained" },
  { metric: "Rule branch coverage", target: "100%", current: "Engine is a stub" },
  { metric: "Allergy filter correctness", target: "Zero leaks across test cases", current: "Tests pending" },
  { metric: "Inference time per scan", target: "Measured and reported", current: "Not measured" },
  { metric: "Recommendation clarity", target: "Pilot rating 1–5", current: "Pilot runs in W15" },
];
