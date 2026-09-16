# Week 7 : Backend, Database, and MST Prep

## PostgreSQL and Migrations

I set up PostgreSQL properly for the staging environment — until now the app had only really been running against SQLite in practice, even though Postgres was the plan on paper. I added Alembic for schema migrations so future model changes (new tables, new columns) can be applied without hand-editing the database.

## AnalysisResult Model

I added a new `AnalysisResult` model/table to persist per-user predictions — severity, skin type, confidence, and timestamp — instead of predictions disappearing once the response was sent. This isn't wired into the `/api/predict` endpoint yet; that's the next step, since the endpoint currently returns a prediction without saving it anywhere.

## Auth Endpoints

I finished locking down `/api/predict` and `/api/recommendations` behind JWT auth (`/api/ingredients` stays public), with token versioning so refresh tokens can be revoked on logout rather than just expiring naturally. Password hashing runs through bcrypt, pinned to `bcrypt==4.0.1` after running into an incompatibility with `passlib==1.7.4` on newer bcrypt versions.

## Test Coverage

I kept the backend test suite passing through all of this — 36+ auth tests and 21+ endpoint tests — running them after each change rather than only before a merge, since auth and DB changes are exactly the kind of thing that break quietly.

## Notes for Next Week

The `AnalysisResult` table is ready but not yet used — wiring it into `/api/predict` so real inference results get saved is the first backend task for next week, alongside swapping the stub predictions for the trained ResNet-50 checkpoint.
