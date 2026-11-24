# Week 16 : Test Suite Failing on Routine ID Consistency and Conflict Filter Missing Forced-Time Assignment

## test_routine_ids_all_appear_in_products Fails When max_products Truncates After Routine Is Built

**Error:**
```
FAILED tests/test_recommendations.py::test_routine_ids_all_appear_in_products
AssertionError: assert 'prod_spf50' in {'prod_niacinamide', 'prod_salicylic', 'prod_ceramide'}
```

**Relevant Context**
The test checks that every product id in `routine["am"]` and `routine["pm"]` also appears in `products`:

```python
# test_recommendations.py
def test_routine_ids_all_appear_in_products(session):
    result = get_recommendations(session, skin_type="oily", acne_severity="moderate")
    product_ids = {p["id"] for p in result["products"]}
    for pid in result["routine"]["am"] + result["routine"]["pm"]:
        assert pid in product_ids   # ← AssertionError
```

The engine was building the routine from the full filtered candidate list, then slicing `products` down to `max_products` afterward:

```python
# engine.py — before fix
kept, excluded = apply_all_filters(candidates, ...)
routine = build_routine(kept)          # built from all kept candidates
products = [format(c) for c in kept][:max_products]   # truncated after
return {"products": products, "routine": routine, ...}
```

Products that did not make the `max_products` cut still appeared in the routine because the routine was built from the untruncated list.

**Key Observation**
The routine must be derived from the same final `products` list that is returned, not from the full pre-truncation list. If truncation happens after routine building, the routine references product ids that the client will never receive.

**Solution**
Truncate `kept` before passing it to `build_routine`:

```python
# engine.py — after fix
kept, excluded = apply_all_filters(candidates, ...)
kept = kept[:max_products]            # truncate first
routine = build_routine(kept)         # routine only references kept ids
products = [format(c) for c in kept]
return {"products": products, "routine": routine, ...}
```

**Because**
The `products` list and the `routine` lists must reference the same set of candidate ids. Building the routine before truncation breaks this invariant and causes the client to receive a routine that references ids it cannot display.

---

## Conflict Filter Leaves lower.forced_time as None When Both Products Are step_time="both"

**Error:**
No crash. But `test_conflicting_pair_never_lands_in_the_same_routine_half` was failing intermittently:

```
FAILED tests/test_recommendations.py::test_conflicting_pair_never_lands_in_the_same_routine_half
AssertionError: assert not ({'retinol', 'salicylic acid'} <= kept_ingredients_by_slot['pm'])
```

**Relevant Context**
Both retinol and salicylic acid products had `step_time="both"` in the catalog. The `conflict_filter` "separate" rule was supposed to assign the higher-ranked one to AM and the lower-ranked one to PM. But the assignment for the lower product only ran if `lower.forced_time is None` and `lower.step_time == "both"`:

```python
# rules.py — before fix
if row["severity"] == "separate":
    higher_slot = higher.forced_time or (higher.step_time if higher.step_time != "both" else None)
    ...
    if higher_slot is None:
        higher.forced_time = "am"
    if lower.forced_time is None and lower.step_time == "both":
        lower.forced_time = "pm" if higher.forced_time == "am" or higher_slot == "am" else "am"
```

When `higher.step_time == "both"` and `higher.forced_time` was `None` before the block ran, `higher_slot` evaluated to `None`. The condition `higher_slot is None` fired and set `higher.forced_time = "am"` — but the `lower.forced_time` assignment checked `higher.forced_time == "am" or higher_slot == "am"`. At that point `higher_slot` was still `None` (computed before the assignment), so the condition used the freshly-set `higher.forced_time == "am"` correctly. However, on a second pass through the loop the same products were processed again and `higher.forced_time` was already `"am"`, so `higher_slot` was now `"am"` — but `lower.forced_time` had already been set, so the branch was skipped. The logic was correct for the first pair but left `lower.forced_time` as `None` when the conflict row appeared more than once (duplicate entries in the conflict table).

**Key Observation**
Duplicate rows in the ingredient conflict table caused the same product pair to be processed twice. On the second pass, `lower.forced_time` was already set so the assignment branch was skipped — but this was fine. The real bug was that `higher_slot` was computed at the top of the block before `higher.forced_time` could be assigned, so when `higher.step_time == "both"` the slot was `None` and the assignment guard `if higher_slot is None` was used to set it, working correctly for a single pass. The intermittent test failure came from catalog data where duplicated conflict rows triggered additional iterations after the forced times were already set, occasionally resetting state.

**Solution**
Compute `higher_slot` after the forced-time assignment, and guard against reprocessing a pair whose slots are already set:

```python
# rules.py — after fix
if row["severity"] == "separate":
    if higher.forced_time is None and higher.step_time == "both":
        higher.forced_time = "am"
    higher_slot = higher.forced_time or higher.step_time

    if lower.forced_time is None and lower.step_time == "both":
        lower.forced_time = "pm" if higher_slot == "am" else "am"
    elif lower.forced_time is None:
        lower_slot = lower.step_time
        if higher_slot and lower_slot and higher_slot == lower_slot:
            dropped_ids.add(lower.id)
            dropped.append(Excluded(lower.id, lower.name, row["reason"] + " (could not be scheduled apart)"))
```

**Because**
Computing a slot variable before the assignment that sets it and then checking the variable for `None` as the trigger for that same assignment creates an ordering dependency. Separating the assignment from the slot read makes the control flow explicit and removes the dependence on iteration order. Deduplicating conflict table lookups at query time also prevents double-processing.

---

## Summary

This week I worked on the final test suite for the recommendations engine. The first bug was an ordering issue where `build_routine` ran before `max_products` truncation, causing the routine to reference product ids that were not in the returned `products` list — fixed by truncating before building the routine. The second was an intermittent conflict filter failure where the "separate" rule left a product's `forced_time` unset when duplicate conflict rows caused the pair to be processed twice — fixed by reordering the slot assignment and deduplicating the conflict query.
