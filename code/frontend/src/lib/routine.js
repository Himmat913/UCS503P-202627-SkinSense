/**
 * Routine building, shared by the Routine page and the preview on the
 * Report page so the two can never disagree about how many steps a routine
 * has. The API returns every product that matched, which is more than a
 * routine should contain; this picks one product per step.
 */

import { CATEGORY_ORDER } from "./skin";

export const BASIC_CATEGORIES = ["cleanser", "moisturiser", "sunscreen"];
export const EXTRA_CATEGORIES = ["toner", "face_mask", "treatment", "serum", "eye_cream"];

/** Times of day a product suits. Unknown timing is skipped, never guessed. */
export function slotsFor(product) {
  if (product.category === "sunscreen") return ["am"];
  if (product.step_time === "both") return ["am", "pm"];
  if (product.step_time === "am" || product.step_time === "pm") return [product.step_time];
  return [];
}

/** category -> { am: [...], pm: [...] }, each list best match first. */
export function buildSlotOptions(products) {
  const map = {};
  for (const product of products) {
    for (const slot of slotsFor(product)) {
      if (!map[product.category]) map[product.category] = { am: [], pm: [] };
      map[product.category][slot].push(product);
    }
  }
  for (const entry of Object.values(map)) {
    entry.am.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    entry.pm.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }
  return map;
}

/** Every distinct product available for a category, best match first. */
export function optionsFor(slotOptions, category) {
  const entry = slotOptions[category];
  if (!entry) return [];
  const byId = new Map();
  for (const product of [...entry.am, ...entry.pm]) byId.set(product.id, product);
  return [...byId.values()].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
}

/**
 * Assembles the routine for the chosen time slots.
 *
 * `selection` maps a category to a product id the user picked; anything not
 * chosen falls back to that category's best match. A category is resolved
 * per slot, so a step never disappears from the morning just because its
 * best overall match happens to be evening-only.
 */
export function assembleRoutine(slotOptions, { categories, slots, selection = {} }) {
  const steps = { am: [], pm: [] };

  for (const category of categories) {
    const options = optionsFor(slotOptions, category);
    if (options.length === 0) continue;
    const chosen = options.find((p) => p.id === selection[category]) || options[0];

    for (const slot of slots) {
      const slotList = slotOptions[category]?.[slot];
      if (!slotList?.length) continue;
      steps[slot].push(slotList.some((p) => p.id === chosen.id) ? chosen : slotList[0]);
    }
  }

  const byOrder = (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  steps.am.sort(byOrder);
  steps.pm.sort(byOrder);
  return steps;
}

/**
 * The default routine: the three basic steps, morning and evening. This is
 * exactly what the Routine page shows before the user changes anything,
 * which is what makes the Report preview match it.
 */
export function defaultRoutine(products) {
  const slotOptions = buildSlotOptions(products || []);
  const categories = BASIC_CATEGORIES.filter((category) => slotOptions[category]);
  return assembleRoutine(slotOptions, { categories, slots: ["am", "pm"] });
}
