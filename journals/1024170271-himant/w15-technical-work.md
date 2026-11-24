# Week 15 : Test KeyError After API Refactor and bcrypt Compatibility Break

## KeyError in Progress Test After Response Shape Changed

**Error:**
```
FAILED tests/test_analysis.py::test_progress_returns_results - KeyError: 'results'
```

**Relevant Context**
The progress endpoint had been refactored to return a bare list instead of a wrapped object, but the test still expected the old shape:

```python
# Old endpoint response shape
{"results": [...], "count": 3}

# New endpoint response shape (after refactor)
[
  {"id": 1, "acne_severity": "mild", ...},
  {"id": 2, "acne_severity": "moderate", ...}
]
```

```python
# test_analysis.py — original test, written against the old shape
def test_progress_returns_results(client, auth_headers):
    res = client.get("/api/progress", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) > 0   # KeyError: 'results' — data is now a list
```

**Key Observation**
The endpoint contract changed during refactoring but the tests were not updated. The test assumed a dict with a `"results"` key, but the endpoint now returns a plain JSON array.

**Solution**
Update the test to match the new response shape:

```python
# test_analysis.py — fixed
def test_progress_returns_results(client, auth_headers):
    res = client.get("/api/progress", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
```

**Because**
When an API response shape changes, every test that inspects the response body needs to be updated to match. The fix is to assert the new shape directly, using `isinstance(data, list)` to confirm it is no longer a dict.

---

## passlib AttributeError with bcrypt 4.1

**Error:**
```
AttributeError: module 'bcrypt' has no attribute '__about__'
```

Raised on every password hash or verify call, breaking login and registration completely.

**Relevant Context**
The error appeared after `pip install -r requirements.txt` on a fresh environment. `requirements.txt` had no pin on bcrypt:

```
# requirements.txt — original
passlib[bcrypt]==1.7.4
# bcrypt version unpinned — pip installs latest (4.1 at the time)
```

passlib 1.7.4 reads the bcrypt version at import time like this:

```python
# passlib internals — why it breaks
import bcrypt
version = bcrypt.__about__.__version__   # AttributeError: bcrypt has no attribute '__about__'
```

bcrypt 4.1 removed `__about__` and switched to `importlib.metadata` for version introspection.

**Key Observation**
passlib 1.7.4 has not been updated to handle bcrypt 4.x. The `__about__` attribute it reads was removed in bcrypt 4.1.

**Solution**
Pin bcrypt to 4.0.1, the last version that still has `__about__`:

```
# requirements.txt — fixed
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
```

**Because**
passlib 1.7.4 is essentially unmaintained. Pinning bcrypt to 4.0.1 keeps passlib working without changing the auth code. The underlying hashing is still secure — the break was only in version introspection.

---

## Summary

This week I ran the full test suite and fixed the two failures. The first was a stale test that had not been updated after the progress endpoint response shape changed. The second was a dependency incompatibility between passlib and bcrypt that breaks all password operations on fresh installs. Both are now fixed and all tests pass.
