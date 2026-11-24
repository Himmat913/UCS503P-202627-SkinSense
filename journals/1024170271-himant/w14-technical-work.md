# Week 14 : Seed Script UniqueViolation and Feedback Router Not Registered

## UniqueViolation on Seed Re-Run

**Error:**
```
psycopg2.errors.UniqueViolation: duplicate key value violates unique constraint "analysis_results_pkey"
DETAIL:  Key (id)=(1) already exists.
sqlalchemy.exc.IntegrityError: (psycopg2.errors.UniqueViolation) ...
ROLLBACK
```

**Relevant Context**
The seed script tried to clear and re-insert demo progress rows in a single transaction:

```python
# seed.py — original broken version
def seed_demo_progress(db: Session):
    db.execute(text("DELETE FROM analysis_results WHERE user_id IN (1, 2, 3)"))
    for row in DEMO_ROWS:
        db.add(AnalysisResult(**row))
    db.commit()   # DELETE and INSERT in the same transaction
```

**Key Observation**
When PostgreSQL hits the `UniqueViolation` on the INSERT it aborts the entire transaction, including the DELETE that already ran. The DELETE and INSERT were both in the same transaction, so they rolled back together and the original rows were still there.

**Solution**
Commit the DELETE in its own transaction before inserting:

```python
# seed.py — fixed version
def seed_demo_progress(db: Session):
    db.execute(text("DELETE FROM analysis_results WHERE user_id IN (1, 2, 3)"))
    db.commit()   # commit the DELETE first
    for row in DEMO_ROWS:
        db.add(AnalysisResult(**row))
    db.commit()   # then commit the INSERTs
```

**Because**
PostgreSQL aborts the entire transaction on any error, including constraint violations. By committing the DELETE separately, the rows are gone before the INSERT tries to add them again, so there is nothing to conflict with.

---

## Feedback Endpoint Returning 404

**Error:**
```
404 Not Found
{"detail": "Not Found"}
```

Posting to `/api/feedback` returned 404 even though `feedback.py` existed and had the router defined correctly.

**Relevant Context**
The feedback router was defined and working in isolation but was never added to the main app:

```python
# feedback.py — router was correct
router = APIRouter()

@router.post("/feedback")
async def submit_feedback(...):
    ...

# main.py — original, missing the feedback router
from fastapi import FastAPI
from . import auth, inference, recommendations, progress, health

app = FastAPI()
app.include_router(auth.router, prefix="/api")
app.include_router(inference.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(health.router)
# feedback.router never registered
```

**Key Observation**
FastAPI only routes requests to routers that have been explicitly registered with `app.include_router()`. Defining a router in a module does not register it.

**Solution**
Import and register the feedback router in `main.py`:

```python
# main.py — fixed
from . import auth, inference, recommendations, progress, health, feedback

app.include_router(feedback.router, prefix="/api")
```

**Because**
FastAPI builds its route table at startup from the routers that are explicitly included. A router that is not passed to `include_router` is simply ignored, which is why the endpoint returned 404 instead of 405 or 500.

---

## Summary

This week I completed the demo seed data setup and wired up the feedback endpoint. The seed fix required understanding how PostgreSQL transaction semantics differ from SQLite — a constraint violation aborts the whole transaction, not just the failing statement. The feedback 404 was a straightforward omission: the router had not been registered in `main.py`.
