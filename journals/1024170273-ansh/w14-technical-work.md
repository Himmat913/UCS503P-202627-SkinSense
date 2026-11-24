# Week 14 : Budget Filter USD vs INR Mismatch and AM Routine Step Order

## Budget Filter Rejecting Products Due to Currency Mismatch

**Error:**
No crash. With a budget of 500 INR set in the profile, the recommendations endpoint returned an empty list even for products that cost less than 500 INR.

**Relevant Context**
The products in the database had prices in USD from the original CSV. The user's budget was stored in INR. The filter compared them directly:

```python
# recommendations.py — original broken filter
def filter_by_budget(products: list, budget_max: float) -> list:
    return [p for p in products if p.price <= budget_max]

# Example:
# p.price = 6.00  (USD — Cetaphil cleanser)
# budget_max = 500  (INR)
# 6.00 <= 500 is True — but 6 USD is ~501 INR, so should be excluded
# A product at p.price = 2.50 USD = 209 INR — should pass, does pass
# A product at p.price = 8.00 USD = 668 INR — should fail, passes (8 <= 500)
```

The comparison was numerically working in some cases but logically wrong throughout.

**Key Observation**
Prices were in USD but the user's budget was in INR. Direct comparison of USD values against an INR budget gives wrong results for most products.

**Solution**
Convert all product prices to INR at seed time, store INR in the database:

```python
# seed.py — fixed price conversion
USD_TO_INR = 83.5

for _, row in df.iterrows():
    price_inr = round(float(row["price_usd"]) * USD_TO_INR, 2)
    db.add(Product(
        name=row["name"],
        price=price_inr,   # stored in INR
        ...
    ))
```

**Because**
Storing prices in a single currency avoids per-query conversion and prevents currency mismatch bugs. INR is the right choice since the target users are in India and the budget input is in INR.

---

## AM Routine Putting SPF Before Moisturiser

**Error:**
No crash. The generated AM routine was ordering steps as: cleanser, serum, SPF, moisturiser — SPF was placed before moisturiser, which is the wrong application order.

**Relevant Context**
The routine builder sorted products alphabetically within each step category:

```python
# routine.py — original broken sort
def build_am_routine(products: list) -> list:
    return sorted(products, key=lambda p: p.category)
# alphabetical: cleanser < moisturiser < serum < spf
# but correct order is: cleanser > toner > serum > moisturiser > spf
```

Alphabetical sorting gives `moisturiser` before `spf` correctly by coincidence, but `serum` comes before `moisturiser` alphabetically, which is wrong.

**Key Observation**
Skincare application order is not alphabetical. The correct order is defined by product absorption: thinnest consistency first, thickest last, with SPF always last in the AM routine.

**Solution**
Define an explicit step order and sort by index:

```python
# routine.py — fixed version
AM_STEPS = ["cleanser", "toner", "serum", "eye_cream", "moisturiser", "spf"]

def build_am_routine(products: list) -> list:
    def step_index(product):
        try:
            return AM_STEPS.index(product.category)
        except ValueError:
            return len(AM_STEPS)   # unknown categories go last
    return sorted(products, key=step_index)
```

**Because**
Explicit ordering by list index enforces the correct clinical application sequence. Unknown categories are placed at the end rather than causing a crash or sorting incorrectly.

---

## Summary

This week I fixed two correctness bugs in the recommendations engine. The budget filter was comparing USD prices against an INR budget, which gave wrong results for most products — fixed by converting all prices to INR at seed time. The AM routine step order was alphabetical instead of following the correct skincare application sequence — fixed with an explicit ordered list.
