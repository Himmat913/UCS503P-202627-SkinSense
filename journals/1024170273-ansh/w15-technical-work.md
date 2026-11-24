# Week 15 : Skin Type Widening Too Narrow and README Missing Model Download Step

## Skin Type Fallback Widening Only for "normal"

**Error:**
No crash. Users with skin type "dry" or "oily" were getting fewer recommendations than expected. The minimum product count check was failing for them even though there were enough products in the catalog.

**Relevant Context**
The recommendation engine had a fallback that widened the skin type pool when too few results were found:

```python
# recommendations.py — original broken widening
def get_recommendations(profile, result):
    recs = query_products(skin_type=result.skin_type, budget=profile.budget_max)

    if len(recs) < MIN_RECS:
        # only widened for "normal" — dry and oily never widened
        if result.skin_type == "normal":
            recs += query_products(skin_type="combination", budget=profile.budget_max)

    return recs[:MAX_RECS]
```

**Key Observation**
The widening was written only for `"normal"` skin type. Users with `"dry"` or `"oily"` skin type hit the low-count branch but got no widening, so they still received fewer recommendations than the minimum.

**Solution**
Define explicit widening groups for all three skin types:

```python
# recommendations.py — fixed version
SKIN_TYPE_WIDENING = {
    "dry":    ["dry", "normal"],
    "normal": ["normal", "dry", "oily"],
    "oily":   ["oily", "normal"],
}

def get_recommendations(profile, result):
    recs = query_products(skin_type=result.skin_type, budget=profile.budget_max)

    if len(recs) < MIN_RECS:
        wider = SKIN_TYPE_WIDENING.get(result.skin_type, [result.skin_type])
        recs = query_products(skin_types=wider, budget=profile.budget_max)

    return recs[:MAX_RECS]
```

**Because**
The widening dict makes the fallback explicit and symmetric for all skin types. `dry` widens to include `normal` products (which are generally safe for dry skin), `oily` widens to include `normal`, and `normal` can use products from all three categories.

---

## README Missing Model File Download Step

**Error:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'code/backend/models/resnet50_acne.pt'
```

Appeared immediately on `uvicorn main:app` for anyone who cloned the repo fresh.

**Relevant Context**
The model files are not in the repository because they are too large for git. But the README setup instructions did not mention them:

```md
# README.md — original setup steps
1. Clone the repo
2. Create a virtual environment and install requirements
3. Set DATABASE_URL and run alembic upgrade head
4. Run python -m db.seed
5. uvicorn code.backend.main:app --reload
   # crashes here — models/ folder is empty
```

**Key Observation**
A fresh clone will always fail at startup because the model files are not in the repo. The README had no mention of this step, so anyone setting up the project for the first time would hit a confusing `FileNotFoundError` with no guidance.

**Solution**
Add a step to the README explaining where to get the model files:

```md
# README.md — fixed setup steps
1. Clone the repo
2. Create a virtual environment: python -m venv venv
3. Install requirements: pip install -r requirements.txt
4. Download model files:
   - resnet50_acne.pt  → place in code/backend/models/
   - mobilenetv2_skintype.pt → place in code/backend/models/
   (Download link: [Google Drive / release page])
5. Set DATABASE_URL and run alembic upgrade head
6. Run python -m db.seed
7. uvicorn code.backend.main:app --reload
```

**Because**
The README is the first thing someone reads when setting up the project. Missing a required step causes a failure that is hard to diagnose from the error message alone. Making the model file step explicit with a download link removes the ambiguity.

---

## Summary

This week I fixed the skin type widening logic in the recommendations engine and updated the README. The widening was only implemented for "normal" skin type, leaving dry and oily users with too few recommendations — fixed with an explicit widening dict for all three types. The README was missing the model file download step, which causes the server to crash immediately on a fresh clone — that step is now documented.
