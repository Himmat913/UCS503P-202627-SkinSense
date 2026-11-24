# Week 14 : Feedback and Progress Endpoints

## Feedback Router

I added a `/api/feedback` endpoint so users can submit a star rating and an optional text comment after viewing their results. The `Feedback` model stores the user id, rating, comment, and timestamp. The Alembic migration for this table was straightforward.

## Progress Router

I added a `/api/progress` endpoint that returns a user's last N analysis results sorted by date. This is what the frontend uses to show how a user's skin condition has changed over time. The response includes severity, skin type, confidence, and date for each result.

## Demo Seed Script

I wrote `scripts/seed_demo_progress.py` to populate three demo accounts (priya, arjun, neha) with realistic analysis history spread over several weeks. The seed also covers the product database. This was needed so the teacher and evaluators can log in and see a working app without having to upload photos themselves.

## Tests

I added tests for both new routers. The feedback test checks that a valid submission returns 200 and that a missing rating field returns 422. The progress test checks that results are sorted by date and that an empty history returns an empty list.
