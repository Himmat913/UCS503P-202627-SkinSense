"""Dermatologist-referral rule."""
from config import LOW_CONFIDENCE_THRESHOLD


def compute_referral(
    acne_severity: str,
    skin_type_confidence: float,
    acne_severity_confidence: float,
    validation_reasons: list[str] | None = None,
) -> dict:
    reasons: list[str] = []

    if acne_severity == "severe":
        reasons.append("Severe acne detected.")
    if skin_type_confidence < LOW_CONFIDENCE_THRESHOLD:
        reasons.append("Low confidence in skin type classification.")
    if acne_severity_confidence < LOW_CONFIDENCE_THRESHOLD:
        reasons.append("Low confidence in acne severity classification.")
    if validation_reasons:
        reasons.append("Photo quality warnings were present during validation.")

    return {"needed": len(reasons) > 0, "reasons": reasons}