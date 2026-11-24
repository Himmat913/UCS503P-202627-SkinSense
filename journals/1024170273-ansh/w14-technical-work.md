# Week 14 : Budget Filtering and Routine Polish

## Budget Filtering

I added optional budget filtering to the recommendation engine. If the user provides a budget in the request, the engine filters to products priced at or below that value before building the routine. The budget is in INR, using the fixed conversion rate applied when the catalog was seeded.

## AM/PM Routine Step Order

I formalised the step order for AM and PM routines. The AM routine goes: cleanser, toner, serum, moisturiser, SPF. The PM routine goes: cleanser, toner, serum, moisturiser (no SPF). The engine now enforces this order in the response rather than returning products in an arbitrary sequence.

## Allergy Exclusion

I added an allergy exclusion list to the user profile schema. The recommendation engine already had a placeholder for this; I wired it up so that any product containing an ingredient on the user's allergy list is excluded before the routine is built.

## Tests

I added tests for budget filtering (a request with a low budget should return cheaper products) and for allergy exclusion (a product containing a flagged ingredient should not appear in the routine).
