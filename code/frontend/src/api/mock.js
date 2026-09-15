/**
 * Fixture data used when the backend is unreachable in "auto"/"mock" mode.
 * Shapes match the real API responses exactly.
 */

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
  { id: "p_020", name: "Retinol 0.5% in Squalane", reason: "Conflicts with salicylic acid already in the evening routine" },
  { id: "p_021", name: "Rose Water Facial Mist", reason: "Contains fragrance, which you listed as something to avoid" },
  { id: "p_022", name: "Vitamin C 20% Brightening Serum", reason: "Above your per-product budget" },
];

export async function mockUpload(file) {
  await delay(700);
  return {
    image_id: `mock_${Date.now().toString(36)}`,
    filename: file?.name || "photo.jpg",
    validation: { ok: true, reasons: [], checks: {}, validator_version: "1.0" },
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
    skin_type_confidence: 1.0,
    acne_severity: "moderate",
    acne_severity_confidence: 0.74,
    source: "model",
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
      dropped.push({ id: product.id, name: product.name, reason: `Contains ${clash}, which you listed as something to avoid` });
      continue;
    }
    if (budgetMax != null && product.price > budgetMax) {
      dropped.push({ id: product.id, name: product.name, reason: `₹${product.price} is above your ₹${budgetMax} per-product budget` });
      continue;
    }
    kept.push(product);
  }

  const inRoutine = (time) => kept.filter((p) => p.step_time === time || p.step_time === "both").map((p) => p.id);
  const order = ["cleanser", "toner", "treatment", "serum", "moisturiser", "sunscreen"];
  const sortByStep = (ids) =>
    [...ids].sort(
      (a, b) => order.indexOf(kept.find((p) => p.id === a).category) - order.indexOf(kept.find((p) => p.id === b).category),
    );

  return {
    engine_version: "1.0",
    products: kept,
    routine: { am: sortByStep(inRoutine("am")), pm: sortByStep(inRoutine("pm")) },
    excluded: dropped,
    notes: kept.length === 0 ? ["No products matched. Try relaxing the budget or removing an ingredient."] : [],
  };
}

export async function mockFeedback(payload) {
  await delay(600);
  return { received: true, id: `fb_${Date.now().toString(36)}`, echo: payload };
}