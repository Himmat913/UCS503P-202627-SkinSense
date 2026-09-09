"""
App entrypoint. Per work-division.md §2.1, this is the one file only Himant
edits — including the two-line router registration for Ansh's and (later)
Muskan's routers, added via the one-time PR protocol in §3.

Run locally:  uvicorn main:app --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGINS
from db.session import init_db
from db.seed import run_seed

from routers import health, analysis, recommendations


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Idempotent: safe on every restart, doesn't duplicate rows.
    init_db()
    run_seed()
    yield


app = FastAPI(title="SkinSense API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(recommendations.router)   # Ansh's router — see work-division.md §3
