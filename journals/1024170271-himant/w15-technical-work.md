# Week 15 : Second Prototype

## End-to-End Test Against PostgreSQL

For the second prototype submission I ran the full flow against the local PostgreSQL database instead of SQLite. I ran `alembic upgrade head` to apply all migrations, seeded the product catalog with `python -m db.seed`, and seeded the demo accounts with `python -m scripts.seed_demo_progress`. The app ran cleanly from a fresh database.

## Backend Cleanup

I reviewed the backend code before the CE and cleaned up a few things: removed some leftover debug prints, made sure all endpoints return consistent error shapes, and added a `README.md` under `code/` explaining how to set up the environment and run both servers.

## Verifying the Referral Flag

The recommendation engine raises a referral flag for severe acne or for predictions with low confidence. I checked this was working correctly by seeding a demo account with a severe severity result and confirming the flag appeared in the recommendations response.

## Notes

The second prototype covers the full prediction and recommendation flow with both real models, photo validation, auth, and persistent history. The main thing left for the final prototype is the frontend redesign and any polish based on second-prototype feedback.
