# Week 7 : Backend and Database

## PostgreSQL and Migrations

Until this week the app was only really running on SQLite, even though Postgres was the plan. I set up PostgreSQL locally and added Alembic for migrations, so schema changes can be applied without editing the database by hand.

## AnalysisResult Model

I added an `AnalysisResult` model and table to store each user's predictions (severity, skin type, confidence and timestamp). It is not connected to `/api/predict` yet, so for now the endpoint returns a prediction without saving it.

## Auth

`/api/predict` and `/api/recommendations` are now behind JWT auth, and `/api/ingredients` stays public. Refresh tokens use token versioning so they can be revoked on logout. Passwords are hashed with bcrypt. I pinned `bcrypt==4.0.1` because `passlib==1.7.4` breaks on newer bcrypt versions.

## Real Acne Inference

I replaced the stub with the trained ResNet-50 checkpoint (`resnet50_acne.pt`). Loading it with the standard torchvision constructor failed with mismatched keys, because the checkpoint was saved from a feature-wrapped version of the model. I changed the loader to detect which format the checkpoint uses and build the matching model. The API now returns `source: "model"` for real predictions. The stub can still be used with the `SKINSENSE_USE_REAL_MODELS` flag.

There is no skin-type model yet, so `/api/predict` with a photo now needs a `skin_type` in the request. The backend uses that value with a confidence of 1.0.

## Product Catalog

I built the product catalog from `kingabzpro/cosmetics-datasets`. The raw file had 1,472 rows and 1,325 were left after removing junk entries from the scrape. The ingredient reference list now has 25 ingredients, our original 12 plus 13 taken from the `amaboh` dataset. The seeded catalog has 1,333 products: the 1,325 real ones and 8 hand-written toner and serum entries, so those routine steps always have something to show.

## Merging Branches

I merged Muskan's frontend branch into mine. The only conflict was in `inference.py`, where her branch still had the old stub version. I kept the real inference version.

## Tests

I ran the backend tests after each change (15 auth tests, 8 analysis tests, 10 recommendation tests and the health check), and all of them pass.

## Notes

`AnalysisResult` still needs to be connected to `/api/predict`. Photo validation is still the stub and the skin-type model is not trained yet.
