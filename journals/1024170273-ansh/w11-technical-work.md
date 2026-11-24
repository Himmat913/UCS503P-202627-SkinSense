# Week 11 : Referral Flag Not Triggering for Low Confidence and Inconsistent Return Type

## Referral Flag Not Triggering for Low-Confidence Predictions

**Error:**
No crash. Users with low-confidence skin type or acne predictions were not being shown the referral recommendation, even though the design required it.

**Relevant Context**
The referral check only looked at acne severity, not confidence scores:

```python
# recommendations.py — original broken version
def should_refer(result: AnalysisResult) -> bool:
    if result.acne_severity == "severe":
        return True
    return False
```

**Key Observation**
A prediction can have moderate acne severity but very low confidence — meaning the model was not sure of its result. That is exactly when a referral is most useful. Checking only severity missed all the low-confidence cases.

**Solution**
Add confidence thresholds as additional referral conditions:

```python
# recommendations.py — fixed version
CONF_THRESHOLD = 0.60

def should_refer(result: AnalysisResult) -> bool:
    if result.acne_severity == "severe":
        return True
    if result.confidence_acne < CONF_THRESHOLD:
        return True
    if result.confidence_skin_type < CONF_THRESHOLD:
        return True
    return False
```

**Because**
Low model confidence is a signal that the prediction may be unreliable, regardless of the predicted severity class. A dermatologist referral is appropriate whenever the app cannot give a confident answer.

---

## get_recommendations Returning dict in One Path and list in Another

**Error:**
```
TypeError: object of type 'dict' has no len()
  File "recommendations.py", line 112, in get_recommendations
    if len(recs) == 0:
```

**Relevant Context**
`get_recommendations` had two return paths that returned different types:

```python
# recommendations.py — original inconsistent return
def get_recommendations(profile: UserProfile, result: AnalysisResult):
    if result.skin_type is None:
        return {"error": "skin_type_required", "recommendations": []}
    # ... normal path ...
    return [Product(...), Product(...), ...]
    # one path returns dict, the other returns list
```

The router called `len(recs)` on the return value, which works for a list but raises `TypeError` on a dict.

**Key Observation**
The early-return path was returning a dict with error metadata while the normal path returned a list of products. The router did not check which type it received before calling `len()`.

**Solution**
Standardise the return type to always be a list, and handle the error condition in the router:

```python
# recommendations.py — fixed, always returns list
def get_recommendations(profile: UserProfile, result: AnalysisResult) -> list:
    if result.skin_type is None:
        return []

    recs = build_recommendations(profile, result)
    return recs

# router — handle the empty list case
@router.get("/recommendations")
async def recommendations(user = Depends(get_current_user), db = Depends(get_db)):
    result = get_latest_result(db, user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="no_analysis_found")
    if result.skin_type is None:
        raise HTTPException(status_code=409, detail="skin_type_required")
    recs = get_recommendations(user.profile, result)
    return recs
```

**Because**
A function should return a consistent type. Mixing `dict` and `list` in return paths forces every caller to check the type before using the return value. Moving the error signalling to HTTP exceptions in the router keeps the business logic function simple and type-consistent.

---

## Summary

This week I improved the referral logic and fixed a type inconsistency in the recommendations function. Referrals now trigger on low-confidence predictions as well as severe acne, which is the more important case. The mixed return type in `get_recommendations` was refactored so the function always returns a list and error conditions are raised as HTTP exceptions in the router.
