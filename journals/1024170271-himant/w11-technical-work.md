# Week 11 : Alembic Migration Running on Wrong Database

## Alembic Running on SQLite Instead of PostgreSQL

**Error:**
```
INFO  [alembic.runtime.migration] Running upgrade  -> a1b2c3d4, add skin_type_source column
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) near "ALTER": syntax error
[SQL: ALTER TABLE analysis_results ADD COLUMN skin_type_source VARCHAR]
```

**Relevant Context**
The `DATABASE_URL` environment variable had been set using `setx` in a previous terminal session:

```cmd
setx DATABASE_URL "postgresql+psycopg2://postgres:password@localhost:5432/skinsense"
```

Then Alembic was run in what appeared to be a new terminal:

```cmd
alembic upgrade head
```

**Key Observation**
`setx` writes the variable to the Windows registry for future processes. It does not affect the terminal that ran it, nor any process already open — including VS Code and all terminals inside it. So Alembic was still picking up the SQLite URL from the VS Code session that was open before `setx` was called.

**Solution**
Use `set` (not `setx`) in the same terminal where Alembic will run:

```cmd
set DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/skinsense
alembic upgrade head
```

**Because**
`set` writes to the current process's environment immediately. `setx` writes to the registry and only takes effect for processes started after that point. VS Code and its integrated terminals inherit the environment that VS Code itself was started with, so `setx` changes are invisible until VS Code is restarted.

---

## Duplicate Column Error on Re-Run

**Error:**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) duplicate column name: skin_type_source
```

**Relevant Context**
Even after opening a new VS Code integrated terminal, the error persisted. The migration had appeared to succeed once, then ran again on the same SQLite file:

```cmd
alembic upgrade head
# ran on SQLite, appeared to succeed
# opened new terminal, ran again
alembic upgrade head
# duplicate column error — column already existed on SQLite
```

**Key Observation**
VS Code's integrated terminal inherits the environment that VS Code was launched with. Opening a new terminal tab inside VS Code does not pick up `setx` changes — only fully restarting VS Code does. The migration was still running against the SQLite file on both attempts.

**Solution**
Close VS Code completely and reopen it. The new VS Code process inherits the registry value set by `setx`, so all integrated terminals inside it will now have the correct `DATABASE_URL`.

```cmd
# After restarting VS Code
echo %DATABASE_URL%
# should print: postgresql+psycopg2://postgres:password@localhost:5432/skinsense
alembic upgrade head
# now runs against PostgreSQL
```

**Because**
Windows environment inheritance works at process creation time. Each process gets a copy of its parent's environment. VS Code's terminal spawns from VS Code's own environment, not from the registry. A full VS Code restart creates a new process that reads the registry values set by `setx`.

---

## Summary

This week I fixed the Alembic migration setup so it reliably runs against PostgreSQL. The root cause was a Windows environment variable inheritance issue: `setx` does not update running processes. The fix is either to use `set` for the current terminal session or to restart VS Code fully after `setx`. The database migration for the `skin_type_source` column then ran cleanly against PostgreSQL.
