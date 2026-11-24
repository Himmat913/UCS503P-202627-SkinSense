# Week 8 : Improvement Plan

## Reviewing the Recommendation Engine

After the prototype I reviewed the recommendation engine output. The AM/PM routine builder was including products that conflicted with each other's ingredients. I added a conflict-check pass that runs after the initial product selection and removes conflicting items from the routine.

## Ingredient Conflict Rules

The original conflict rules were limited to a small hardcoded list. I expanded this to 4 sourced rules based on common dermatology guidance: retinol should not be used in the same routine as AHAs or BHAs, and benzoyl peroxide should not be combined with retinol. These rules are applied at the routine-building step, not at the product filtering step, so each product is still individually eligible but pairs that conflict are separated into different routine slots.

## Product Catalog Review

I checked the product catalog for entries with missing or incomplete ingredient lists. About 40 products had no ingredient data at all. I removed those from the catalog so the conflict checker does not silently skip them.

## Improvement Plan

My plan for the remaining weeks: improve the referral flag logic, add a minimum confidence threshold below which the engine refuses to generate a routine, and clean up the documentation.
