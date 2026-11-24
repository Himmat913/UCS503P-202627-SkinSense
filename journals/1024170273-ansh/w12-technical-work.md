# Week 12 : Recommendations Engine Returning Wrong Shape and Budget Filter Currency Mismatch

## get_recommendations Returns Dict Instead of List for Products

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'map')
  at Recommendations.jsx:48
```

**Relevant Context**
The frontend called `result.products.map(...)` but `products` was a plain object, not an array. The engine was returning a dict keyed by product id:

```python
# recommendations/engine.py — before fix
def get_recommendations(session, skin_type, acne_severity, ...):
    ...
    products = {}
    for candidate in kept:
        products[candidate.id] = {
            "id": candidate.id,
            "name": candidate.name,
            ...
        }
    return {
        "products": products,   # dict, not list
        "routine": routine,
        ...
    }
```

The React component expected an array:

```jsx
// Recommendations.jsx
{result.products.map((p) => (     // TypeError — .map is not a function on {}
  <ProductCard key={p.id} product={p} />
))}
```

**Key Observation**
Python dicts and JavaScript objects look similar but React array methods (`map`, `filter`, `length`) only work on actual arrays. Returning `products` as a dict broke every component that iterated over it. The API contract between backend and frontend must be agreed on a list type for collections.

**Solution**
Return `products` as a list in the engine:

```python
# recommendations/engine.py — after fix
    products = []
    for candidate in kept:
        products.append({
            "id": candidate.id,
            "name": candidate.name,
            ...
        })
    return {
        "products": products,   # list — .map works in React
        "routine": routine,
        ...
    }
```

**Because**
JSON arrays map to JavaScript arrays, which have `.map()`. JSON objects map to plain JavaScript objects, which do not. The fix aligns the return type with what the Pydantic response model (`RecommendationResponse`) and the frontend both expect.

---

## Budget Filter Comparing INR Prices Against USD Ceiling

**Error:**
No crash. But products priced at ₹400–₹600 were being excluded when the user set a budget of 500. The user expected ₹500 to include ₹400 products — but the filter was treating prices as USD.

**Relevant Context**
Product prices in `products.json` were stored in INR (e.g. `"price": 450`). The budget ceiling coming in from the frontend was also in INR. But an earlier version of the seed script had stored prices in USD and multiplied by `USD_TO_INR = 83.5` only for display. After the seed was updated to store native INR prices, the display conversion was removed — but the budget comparison was never updated. It was still comparing raw stored values as if they were USD:

```python
# rules.py — before fix (prices stored as INR, budget in INR)
def budget_filter(candidates, budget_max):
    if budget_max is None:
        return candidates, []
    kept, dropped = [], []
    for c in candidates:
        # c.price is ₹450, budget_max is ₹500
        # comparison is correct numerically, but old code had a
        # USD_TO_INR conversion here that was left in by mistake:
        price_in_comparison_units = c.price * 83.5   # ← bug: double-converting
        if price_in_comparison_units > budget_max:
            dropped.append(Excluded(c.id, c.name, f"₹{c.price} is above your ₹{budget_max} per-product budget."))
        else:
            kept.append(c)
    return kept, dropped
```

A ₹450 product was being compared as `450 × 83.5 = 37,575` against a budget of `500`, so it was always excluded.

**Key Observation**
When the seed script was refactored to store prices natively in INR, the stale `USD_TO_INR` multiplier in `budget_filter` was not removed. This made the budget filter reject almost every product regardless of the user's ceiling.

**Solution**
Remove the stale conversion — compare price directly in INR:

```python
# rules.py — after fix
def budget_filter(candidates, budget_max):
    if budget_max is None:
        return candidates, []
    kept, dropped = [], []
    for c in candidates:
        if c.price > budget_max:   # both in INR — no conversion needed
            dropped.append(Excluded(c.id, c.name, f"₹{c.price} is above your ₹{budget_max} per-product budget."))
        else:
            kept.append(c)
    return kept, dropped
```

**Because**
Once prices are stored in a single currency throughout the pipeline, no conversion is needed at comparison time. The bug survived refactoring because the multiplier was embedded in the filter logic rather than in the seed script where the currency decision was made.

---

## Summary

This week I debugged two issues in the recommendations engine. The first was a frontend crash caused by the engine returning `products` as a dict instead of a list — fixed by changing the return type to match the Pydantic schema and React's `.map()` expectation. The second was a budget filter that double-applied a currency conversion after the seed script was updated to store native INR prices — fixed by removing the stale `USD_TO_INR` multiplier from the filter. Both bugs were caught by running the full recommendations flow end-to-end with a real database rather than unit tests alone.
