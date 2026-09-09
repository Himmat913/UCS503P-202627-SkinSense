# Week 6 : Data Pipelines and First Training Run

## Database Models and Bootstrap

I set up the SQLAlchemy models and the SQLite bootstrap so the product catalog, ingredients, allergens, and conflict-pair table had a real persistent schema instead of in-memory stub data.

## Seed Catalog

I seeded the catalog with an initial set of products (target of 40+), each tagged with ingredients and allergen information, sourced from public ingredient lists.

## First Real Rule Pass

I replaced the stub recommendation logic with the first real rule pass — matching by skin type and severity, plus allergy filtering — behind the same frozen function signature, so nothing on Himmat's or Muskan's side needed to change. The engine version flipped from `stub-0.1` to `rules-0.9`.

## Progress Report Skeleton

I started the skeleton for the progress report, including a note on the 3-class vs. 4-class severity decision for the acne model, to be filled in as the team's results come in.
