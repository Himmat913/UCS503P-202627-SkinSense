# Week 8 : Conflict Rule Blocking Valid AM/PM Split Routines and Catalog Junk Entries

## Conflict Rule Blocking Benzoyl Peroxide + Retinol When Used in Different Slots

**Error:**
No crash. The routine builder flagged a conflict between benzoyl peroxide and retinol even when benzoyl peroxide was in the AM routine and retinol was in the PM routine. These two should not conflict when used at different times of day.

**Relevant Context**
The conflict checker was working on a flat set of all ingredients across both AM and PM slots:

```python
# rules.py — original broken version
def check_conflicts(am_products: list, pm_products: list) -> list[str]:
    all_ingredients = set()
    for p in am_products + pm_products:
        all_ingredients.update(p.ingredients)

    conflicts = []
    for rule in CONFLICT_RULES:
        if rule.a in all_ingredients and rule.b in all_ingredients:
            conflicts.append(f"{rule.a} conflicts with {rule.b}")
    return conflicts

# CONFLICT_RULES includes: benzoyl_peroxide + retinol = True
# flat set had both — false positive conflict raised
```

**Key Observation**
The conflict rules are written for products used at the same time. Benzoyl peroxide and retinol are incompatible together but are commonly recommended in a split AM/PM routine. Checking conflicts on a merged flat set ignores time-of-day context entirely.

**Solution**
Check conflicts per slot, not across both slots combined:

```python
# rules.py — fixed version
def check_conflicts(am_products: list, pm_products: list) -> list[str]:
    conflicts = []
    for slot_products in [am_products, pm_products]:
        slot_ingredients = set()
        for p in slot_products:
            slot_ingredients.update(p.ingredients)
        for rule in CONFLICT_RULES:
            if rule.a in slot_ingredients and rule.b in slot_ingredients:
                conflicts.append(f"{rule.a} conflicts with {rule.b} (same slot)")
    return conflicts
```

**Because**
Ingredient conflicts occur when two incompatible actives are applied together on the skin. If they are used in separate routines hours apart, the skin has fully absorbed the first before the second is applied, eliminating the interaction.

---

## Junk Entries in Product Catalog After Import

**Error:**
No crash. The seeded product catalog contained entries like:

```
name: "Unnamed: 0"
price: 0
category: null
```

These showed up in recommendations and in the ingredients browser.

**Relevant Context**
The catalog was imported from a CSV file without any cleaning:

```python
# seed.py — original broken import
import pandas as pd

df = pd.read_csv("products.csv")
for _, row in df.iterrows():
    db.add(Product(**row.to_dict()))
```

The CSV had an unnamed index column (`Unnamed: 0`), rows with missing prices, and duplicate entries from multiple download passes.

**Key Observation**
pandas preserves the CSV's index column as a data column named `Unnamed: 0` when the CSV was saved with the default index. Zero-price and null-category rows were also present from incomplete data entries.

**Solution**
Clean the dataframe before inserting:

```python
# seed.py — fixed import
df = pd.read_csv("products.csv")
df = df.dropna(subset=["name", "price", "category"])
df = df[~df["name"].str.startswith("Unnamed")]
df = df[df["price"] > 0]
df = df.drop_duplicates(subset=["name"])

for _, row in df.iterrows():
    db.add(Product(**row.to_dict()))
```

**Because**
`dropna` removes rows with null values in required fields. The `startswith("Unnamed")` filter removes pandas index columns. The `price > 0` filter removes placeholder rows. `drop_duplicates` removes products that appeared in multiple download passes.

---

## Summary

This week I fixed two issues in the recommendations engine. The conflict rule was producing false positives for valid AM/PM split routines because it merged both slots into one flat ingredient set. Checking per-slot fixed that. The product catalog import was letting junk rows through — a cleaning pass before insertion removed the placeholder entries and duplicates.
