# Week 16 : Alembic DuplicateColumn After Manual DDL and Merge Conflict Resolution

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

## Merge Conflict in Arnav's Journal Index

**Error:**
```
CONFLICT (content): Merge conflict in journals/1024170259-arnav/index.md
Automatic merge failed; fix conflicts and then commit the result.
```

**Relevant Context**
Two people had edited Arnav's index file on different branches and git could not auto-merge them:

```
<<<<<<< HEAD
- [w15-technical-work.md](w15-technical-work.md) : Test suite and bug fixes
=======
- [w15-technical-work.md](w15-technical-work.md) : Performance profiling
>>>>>>> feature/arnav-w15
```

**Key Observation**
Both edits were to the same line in the index file. This was not a semantic conflict — one side just had a different subtitle for the same week. Since this was Arnav's index file, taking his version was the right call.

**Solution**
Accept the incoming branch's version for that file:

```bash
git checkout --theirs journals/1024170259-arnav/index.md
git add journals/1024170259-arnav/index.md
git commit
```

**Because**
`git checkout --theirs` replaces the conflicted file with the version from the branch being merged in. For a file you do not own, taking `--theirs` is safer than manually editing the conflict markers, because it avoids accidentally introducing a hybrid version that neither side intended.

---

## Summary

This week I handled two issues that came up during final integration. The first was a gap between manual database changes and Alembic's migration history — resolved by using `alembic stamp` to sync the two. The second was a merge conflict in another contributor's journal file — resolved cleanly by taking their version with `git checkout --theirs`. The project is now in a consistent state with all migrations tracked by Alembic and no pending conflicts.
