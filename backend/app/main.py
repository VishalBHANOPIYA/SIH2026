from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, auth, cases, documents, trust

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("="*40)
    print("🚀 Starting SecureCase DMS Backend...")
    print("="*40)
    yield
    print("Shutting down...")

app = FastAPI(
    title="SecureCase DMS",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(trust.router, tags=["Trust Layer"])
