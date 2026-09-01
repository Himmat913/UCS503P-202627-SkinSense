/**
 * Fixture data.
 *
 * Every shape here matches the frozen contract in
 * docs/planning/work-division.md §4, so swapping the real backend in is a
 * config change, not a rewrite. This exists so the full feature set can be
 * demonstrated before any model is trained — never to make an unfinished
 * module look finished. The UI labels this data wherever it appears.
 */

/** Simulates network + inference latency so loading states are visible. */
function delay(ms = 550) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PRODUCTS = [
  {
    id: "p_001",
    name: "Gentle Foaming Cleanser",
    brand: "Cetaphil",
    category: "cleanser",
    price: 349,
    currency: "INR",
    step_time: "both",
    key_ingredients: ["glycerin", "niacinamide"],
    reasons: ["Non-stripping for daily use", "Suits oily skin without over-drying"],
    match_score: 0.91,
  },
  {
    id: "p_002",
    name: "2% Salicylic Acid Solution",
    brand: "The Ordinary",
    category: "treatment",
    price: 650,
    currency: "INR",
    step_time: "pm",
    key_ingredients: ["salicylic acid"],
    reasons: ["Targets moderate acne", "Unclogs pores in oily skin"],
    match_score: 0.88,
  },
  {
    id: "p_003",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "Minimalist",
    category: "serum",
    price: 399,
    currency: "INR",
    step_time: "both",
    key_ingredients: ["niacinamide", "zinc pca"],
    reasons: ["Reduces sebum production", "Helps post-acne marks fade"],
    match_score: 0.84,
  },
  {
    id: "p_004",
    name: "Oil-Free Gel Moisturiser",
    brand: "Neutrogena",
    category: "moisturiser",
    price: 499,
    currency: "INR",
    step_time: "both",
    key_ingredients: ["hyaluronic acid", "glycerin"],
    reasons: ["Hydrates without adding oil", "Non-comedogenic"],
    match_score: 0.87,
  },
  {
    id: "p_005",
    name: "Matte Sunscreen SPF 50 PA+++",
    brand: "Re'equil",
    category: "sunscreen",
    price: 690,
    currency: "INR",
    step_time: "am",
    key_ingredients: ["zinc oxide", "titanium dioxide"],
    reasons: ["No white cast on medium skin tones", "Essential while using exfoliating acids"],
    match_score: 0.9,
  },
  {
    id: "p_006",
    name: "Alcohol-Free Hydrating Toner",
    brand: "Klairs",
    category: "toner",
    price: 780,
    currency: "INR",
    step_time: "both",
    key_ingredients: ["hyaluronic acid", "panthenol"],
    reasons: ["Restores moisture after cleansing", "No drying alcohols"],
    match_score: 0.76,
  },
];

const EXCLUDED = [
  {
    id: "p_020",
    name: "Retinol 0.5% in Squalane",
    reason: "Conflicts with salicylic acid already in the evening routine",
  },
  {
    id: "p_021",
    name: "Rose Water Facial Mist",
    reason: "Contains fragrance, which you listed as an ingredient to avoid",
  },
  {
    id: "p_022",
    name: "Vitamin C 20% Brightening Serum",
    reason: "Above your per-product budget",
  },
];

const INGREDIENTS = [
  { name: "Salicylic acid", type: "BHA", suits: ["oily", "normal"], role: "Unclogs pores, reduces inflammatory acne", caution: "Can irritate dry skin; introduce gradually" },
  { name: "Niacinamide", type: "Vitamin B3", suits: ["oily", "dry", "normal"], role: "Regulates sebum, evens tone", caution: "Well tolerated by most skin types" },
  { name: "Retinol", type: "Retinoid", suits: ["normal", "oily"], role: "Increases cell turnover, treats acne and texture", caution: "Evening only; increases sun sensitivity" },
  { name: "Benzoyl peroxide", type: "Antimicrobial", suits: ["oily"], role: "Kills acne-causing bacteria", caution: "Bleaches fabric; drying at higher strengths" },
  { name: "Hyaluronic acid", type: "Humectant", suits: ["oily", "dry", "normal"], role: "Draws water into the skin", caution: "Apply to damp skin, seal with moisturiser" },
  { name: "Ascorbic acid", type: "Vitamin C", suits: ["dry", "normal"], role: "Antioxidant, brightens post-acne marks", caution: "Unstable; store away from light" },
  { name: "Zinc oxide", type: "Mineral filter", suits: ["oily", "dry", "normal"], role: "Broad-spectrum UV protection", caution: "May leave a cast on deeper skin tones" },
  { name: "Fragrance", type: "Additive", suits: [], role: "Scent only, no skincare benefit", caution: "A common contact allergen" },
];

const CONFLICTS = [
  { a: "Retinol", b: "Salicylic acid", severity: "avoid together", reason: "Combined exfoliation raises the risk of barrier damage and irritation.", handling: "Alternate nights, or use one in the morning and one in the evening." },
  { a: "Retinol", b: "Benzoyl peroxide", severity: "avoid together", reason: "Benzoyl peroxide can oxidise retinol, reducing the effect of both.", handling: "Use on alternate evenings." },
  { a: "Benzoyl peroxide", b: "Ascorbic acid", severity: "separate", reason: "Oxidation reduces the stability of vitamin C.", handling: "Vitamin C in the morning, benzoyl peroxide in the evening." },
  { a: "Salicylic acid", b: "Ascorbic acid", severity: "caution", reason: "Stacking low-pH actives can irritate sensitive skin.", handling: "Space them across the day and watch for stinging." },
];

/* ------------------------------------------------------------------ mocks */

export async function mockUpload(file) {
  await delay(700);
  return {
    image_id: `mock_${Date.now().toString(36)}`,
    filename: file?.name || "photo.jpg",
    validation: {
      ok: true,
      reasons: [],
      checks: { face_count: 1, brightness: 0.63, yaw_deg: 7.2, blur_score: 148.0 },
      validator_version: "fixture-0.1",
    },
  };
}

export async function mockPredict({ manual } = {}) {
  await delay(900);

  if (manual) {
    return {
      image_id: null,
      skin_type: manual.skin_type,
      skin_type_confidence: 1.0,
      acne_severity: manual.acne_severity,
      acne_severity_confidence: 1.0,
      lesion_count_estimate: null,
      skin_tone: null,
      source: "manual",
      referral: {
        needed: manual.acne_severity === "severe",
        reasons: manual.acne_severity === "severe" ? ["Severe acne reported"] : [],
      },
    };
  }

  return {
    image_id: "mock_image",
    skin_type: "oily",
    skin_type_confidence: 0.87,
    acne_severity: "moderate",
    acne_severity_confidence: 0.74,
    lesion_count_estimate: 12,
    skin_tone: {
      undertone: "warm",
      fitzpatrick: "IV",
      hex: "#c68642",
      note: "Mineral sunscreens may leave a slight cast — tinted formulas suit this range better.",
    },
    source: "stub",
    referral: { needed: false, reasons: [] },
  };
}

export async function mockRecommendations({ allergies = [], budgetMax = null } = {}) {
  await delay(650);

  const lowered = allergies.map((entry) => entry.toLowerCase());

  const kept = [];
  const dropped = [...EXCLUDED];

  for (const product of PRODUCTS) {
    const clash = product.key_ingredients.find((ingredient) => lowered.includes(ingredient));
    if (clash) {
      dropped.push({ id: product.id, name: product.name, reason: `Contains ${clash}, which you listed as an ingredient to avoid` });
      continue;
    }
    if (budgetMax != null && product.price > budgetMax) {
      dropped.push({ id: product.id, name: product.name, reason: `₹${product.price} is above your ₹${budgetMax} per-product budget` });
      continue;
    }
    kept.push(product);
  }

  const inRoutine = (time) =>
    kept.filter((p) => p.step_time === time || p.step_time === "both").map((p) => p.id);

  const order = ["cleanser", "toner", "treatment", "serum", "moisturiser", "sunscreen"];
  const sortByStep = (ids) =>
    [...ids].sort(
      (a, b) =>
        order.indexOf(kept.find((p) => p.id === a).category) -
        order.indexOf(kept.find((p) => p.id === b).category),
    );

  return {
    engine_version: "fixture-0.1",
    products: kept,
    routine: { am: sortByStep(inRoutine("am")), pm: sortByStep(inRoutine("pm")) },
    excluded: dropped,
    notes: kept.length === 0 ? ["No products matched. Try relaxing the budget or removing an ingredient."] : [],
  };
}

export async function mockIngredients() {
  await delay(400);
  return { ingredients: INGREDIENTS, conflicts: CONFLICTS, catalog_version: "fixture-0.1" };
}

export async function mockFeedback(payload) {
  await delay(600);
  return { received: true, id: `fb_${Date.now().toString(36)}`, echo: payload };
}
