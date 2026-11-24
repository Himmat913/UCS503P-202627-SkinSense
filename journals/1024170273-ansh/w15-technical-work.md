# Week 15 : Second Prototype

## Final Catalog Check

Before the CE I did a final pass over the product catalog. I checked that every product in the catalog has at least a name, category, and price. Products missing all ingredient data were already removed in an earlier week; this pass was just a sanity check.

## Recommendation Engine Walkthrough

I walked through the recommendation engine manually for each of the three severity levels and both skin type extremes (oily and dry) to check that the routines made sense. I found that for normal skin the engine was returning no serum in the AM routine because the skin-type filter was too narrow. I widened the filter to include products suitable for all skin types when no skin-specific product is available.

## README Update

I updated the backend README to document the recommendation engine's filtering steps in order: allergy exclusion, skin-type filtering, severity suitability, budget filtering, conflict removal, routine ordering.

## Notes

The recommendation engine for the second prototype covers all the core filtering logic. The main remaining item is wiring the allergy list to the user profile in the frontend, which Muskan is handling.
