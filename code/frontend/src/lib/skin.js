export const SKIN_TYPES = [
  { value: "oily", label: "Oily", hint: "Shiny by midday, visible pores" },
  { value: "dry", label: "Dry", hint: "Feels tight, flaky in places" },
  { value: "normal", label: "Normal", hint: "Mostly balanced, few concerns" },
];

export const SEVERITIES = [
  { value: "mild", label: "Mild", hint: "A few spots now and then" },
  { value: "moderate", label: "Moderate", hint: "Regular, visible breakouts" },
  { value: "severe", label: "Severe", hint: "Widespread or painful, lasting" },
];

export const SEVERITY_NOTES = {
  mild: "Occasional spots. Gentle, consistent care is usually enough.",
  moderate: "Regular breakouts. Targeted actives help, introduced slowly.",
  severe: "Widespread breakouts. Products can support care, but a dermatologist should guide treatment.",
};

/** Canonical application order, matching the backend's routine builder. */
export const CATEGORY_ORDER = [
  "cleanser",
  "toner",
  "face_mask",
  "treatment",
  "serum",
  "eye_cream",
  "moisturiser",
  "sunscreen",
];

export const CATEGORIES = {
  cleanser: { label: "Cleanser", plural: "Cleansers", art: "pump", tint: "mint", hint: "Washes away oil and buildup" },
  toner: { label: "Toner", plural: "Toners", art: "bottle", tint: "peach", hint: "Preps skin after cleansing" },
  face_mask: { label: "Face mask", plural: "Face masks", art: "jar", tint: "mint", hint: "A weekly deeper treatment" },
  treatment: { label: "Treatment", plural: "Treatments", art: "dropper", tint: "butter", hint: "Active ingredient for breakouts" },
  serum: { label: "Serum", plural: "Serums", art: "dropper", tint: "blush", hint: "Targets one specific concern" },
  eye_cream: { label: "Eye cream", plural: "Eye creams", art: "tube", tint: "blush", hint: "Gentle care for the eye area" },
  moisturiser: { label: "Moisturiser", plural: "Moisturisers", art: "jar", tint: "peach", hint: "Locks in hydration" },
  sunscreen: { label: "Sunscreen", plural: "Sunscreens", art: "tube", tint: "butter", hint: "Daily UV protection" },
};

export function categoryMeta(category) {
  return (
    CATEGORIES[category] || {
      label: titleCase(category || "Product"),
      plural: titleCase(category || "Products"),
      art: "bottle",
      tint: "peach",
      hint: "",
    }
  );
}

export function titleCase(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label || titleCase(value || "");
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatPrice(amount, currency = "INR") {
  if (amount == null) return "";
  if (currency === "INR") return inr.format(amount);
  return `${amount} ${currency}`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** The API stores naive UTC timestamps; mark them as UTC before parsing. */
export function parseServerDate(value) {
  if (!value) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}
