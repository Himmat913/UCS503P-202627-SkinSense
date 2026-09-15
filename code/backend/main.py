"""App entrypoint. Run locally: uvicorn main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGINS, USING_DEV_JWT_SECRET
from db.session import init_db
from db.seed import run_seed

from routers import health, analysis, recommendations, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    run_seed()
    if USING_DEV_JWT_SECRET:
        print(
            "\n*** WARNING: SKINSENSE_JWT_SECRET is not set — using the insecure "
            "dev default. Set it before staging/production. ***\n"
        )
    yield


app = FastAPI(title="SkinSense API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(analysis.router)
app.include_router(recommendations.router)