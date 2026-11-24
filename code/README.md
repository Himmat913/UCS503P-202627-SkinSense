# SkinSense: running the app

SkinSense has two parts that run side by side:

- `backend/`: FastAPI API, SQLite or PostgreSQL database, MediaPipe photo validation and the ResNet-50 acne-severity model.
- `frontend/`: React + Vite web app.

## Requirements

- Python 3.12 (3.11 also works; MediaPipe 0.10.21 has no wheels for 3.13)
- Node.js 20 or newer
- The acne model checkpoint at `backend/ml_models/acne/resnet50_acne.pt` (included). If it is missing, the API still runs but acne results come from a labelled fallback (`source: "stub"`), never from a real model.

## 1. Backend

```bash
cd code/backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

PyTorch from PyPI is a large download. For a CPU-only machine, install torch first and then the rest:

```bash
pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

Set a real JWT secret (any long random string), then start the API:

```bash
# macOS/Linux
export SKINSENSE_JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
# Windows PowerShell
$env:SKINSENSE_JWT_SECRET = python -c "import secrets; print(secrets.token_hex(32))"

uvicorn main:app --reload
```

The API runs at http://127.0.0.1:8000 and creates `skinsense.db` (SQLite) and the product catalogue on first start.

Optional environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Use PostgreSQL instead of SQLite, e.g. `postgresql+psycopg2://user:pass@host/skinsense` |
| `SKINSENSE_JWT_SECRET` | Token signing secret. Required for anything beyond local development |
| `SKINSENSE_FRONTEND_ORIGIN` | Extra allowed CORS origin for a deployed frontend |
| `SKINSENSE_USE_REAL_MODELS` | Set to `0` to force the labelled fallback instead of the checkpoint |

For PostgreSQL, apply migrations with `alembic upgrade head` before starting the API.

## 2. Frontend

```bash
cd code/frontend
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:5173. The frontend talks to the API at `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`).

There is no offline or demo mode: if the API isn't running, the app says it can't reach the server rather than showing made-up results.

Other commands: `npm run build` (production build into `dist/`), `npm run preview` (serve that build), `npm run lint`.

The camera option needs `localhost` or HTTPS; browsers block camera access on plain HTTP addresses.

## 3. Tests

Backend unit and API tests (61):

```bash
cd code/backend
pytest
```

Run them against a throwaway database so your local data is untouched, e.g. `DATABASE_URL=sqlite:////tmp/skinsense_test.db pytest`.

Browser end-to-end tests (65 checks) are in `code/tests_e2e/`. See the README there.

## API overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | Liveness check |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh` | no | Accounts and tokens |
| POST | `/api/auth/logout` | yes | Revokes all of the user's tokens |
| GET | `/api/auth/me` | yes | Current user |
| POST | `/api/upload` | yes | Store a photo and run MediaPipe validation |
| POST | `/api/predict` | yes | Acne severity from a stored photo, or a manual entry |
| GET | `/api/analyses` | yes | The signed-in user's saved checks, newest first |
| POST | `/api/recommendations` | yes | Products, routine and exclusions for a skin profile |
| GET | `/api/ingredients` | no | Ingredient reference notes and conflict pairs |
| POST | `/api/feedback` | yes | Store a clarity rating |
