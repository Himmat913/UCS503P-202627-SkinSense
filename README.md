# SkinSense

AI-based skin analysis and skincare recommendation app,
built as the UCS503P (Software Engineering) project for
2026-27 ODD.

SkinSense predicts skin type and acne severity from a
user photo and turns that into a practical skincare
routine and product recommendations (budget-filtered,
allergy-aware, ingredient-conflict checked), with
longitudinal (weekly) tracking and a safety-net
dermatologist-referral flow for severe or
low-confidence cases.

**Team**: Himantveer Kaur, Muskan Kohli, Ansh Bindal,
Arnav Chandla (CSED, Thapar) -- Instructor: Nisha Thakur

## Project layout

- `code/backend` -- FastAPI backend
- `code/frontend` -- React (Vite) frontend
- `ml` -- model training/inference code (skin type,
  acne severity)
- `journals` -- weekly per-member journal entries, one
  folder per team member
- `docs` -- project documentation, built with `mkdocs`
- `project-proposal`, `project-report-prototype-stage`,
  `project-report-final` -- the 3 required LaTeX reports

## Docs

The `docs` folder is an organised collection of
markdown (`md`) files, built via
[`mkdocs`](https://www.mkdocs.org/).  Any commit to the
`master` branch triggers a CI/CD build and deployment of
the documentation, including the journals.

For a local DEV-version of the docs for viewing and
testing, install the local env and issue the following
command:

``` shell
make docs
```

### Local `env` for `docs`

``` shell

```