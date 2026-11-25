# Week 16 : Alembic DuplicateColumn After Manual DDL and JWT Refresh 422 on Missing Key

## DuplicateColumn Error from Manual ALTER TABLE

**Error:**
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.DuplicateColumn)
column "skin_concern" of relation "user_profiles" already exists
```

**Relevant Context**
The `skin_concern` column had been added to the table manually using `psql` while Alembic was not being used:

```sql
-- ran directly in psql
ALTER TABLE user_profiles ADD COLUMN skin_concern VARCHAR;
```

Later, an Alembic migration was written to add the same column:

```python
# migrations/versions/xxxx_add_skin_concern.py
def upgrade():
    op.add_column("user_profiles", sa.Column("skin_concern", sa.String(), nullable=True))
```

When `alembic upgrade head` ran, it tried to add a column that already existed in PostgreSQL, causing the error.

**Key Observation**
Alembic tracks which migrations have run in its `alembic_version` table, not what columns actually exist in the database. The manual `ALTER TABLE` created the column in the database but Alembic did not know about it, so it tried to add it again.

**Solution**
Tell Alembic to treat the migration as already applied without running it:

```cmd
alembic stamp xxxx_add_skin_concern
```

Or, if you want future robustness, use `IF NOT EXISTS` in the migration:

```python
def upgrade():
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS skin_concern VARCHAR")
```

**Because**
`alembic stamp` updates the `alembic_version` table to mark a revision as applied without executing the migration SQL. This re-syncs Alembic's view of the world with what actually exists in the database.

---

## JWT Refresh Endpoint Returns 422 When Body Key Is Wrong

**Error:**
```
POST /api/auth/refresh  →  422 Unprocessable Entity
{
  "detail": [
    {
      "loc": ["body", "refresh_token"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Relevant Context**
The frontend was sending the refresh call with the key `token` instead of `refresh_token`:

```js
// auth.js — before fix
const response = await api.post("/api/auth/refresh", {
  token: localStorage.getItem("refresh_token"),   // wrong key
});
```

The FastAPI endpoint expected:

```python
# auth.py
class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/auth/refresh")
def refresh(payload: RefreshRequest, session: Session = Depends(get_session)):
    ...
```

Pydantic validated the body against `RefreshRequest` and rejected the request because the `refresh_token` field was absent. The error appeared only after JWT expiry, so it was not caught during earlier testing when access tokens were still valid.

**Key Observation**
Pydantic model field names must match exactly what the client sends. A wrong key name does not raise a 400 — it raises 422 with a Pydantic validation error listing the missing field. The bug was invisible during initial testing because access tokens had a one-hour TTL and tests did not wait for expiry.

**Solution**
Match the request body key to the Pydantic model field:

```js
// auth.js — after fix
const response = await api.post("/api/auth/refresh", {
  refresh_token: localStorage.getItem("refresh_token"),  // correct key
});
```

**Because**
FastAPI uses Pydantic to parse and validate JSON request bodies. If a required field is missing from the JSON object, Pydantic raises a `ValidationError` and FastAPI returns 422 automatically before the route function runs. Renaming the client-side key to match the model field resolves the mismatch.

---

## Summary

This week I fixed two issues that surfaced during final integration. The first was an Alembic state mismatch caused by a manual DDL change — resolved by using `alembic stamp` to sync the migration history with the actual database schema. The second was a 422 error on the JWT refresh endpoint caused by the frontend sending the wrong JSON key — resolved by correcting the key name to match the Pydantic model field. Both issues were only visible in a fully integrated environment, not in isolated unit tests.

