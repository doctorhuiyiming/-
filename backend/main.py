import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_tables
from routers import assets, audio, export, projects, slices, sse, upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)  # ensure exists before StaticFiles mount


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Drama Factory backend...")
    create_tables()
    logger.info("Database tables created / verified.")

    # Re-trigger parsing for any projects stuck in "解析中" after a restart
    from database import SessionLocal
    from models import Project
    from services.mock_ai import simulate_parsing
    from services.sse_manager import sse_manager
    db = SessionLocal()
    try:
        stuck = db.query(Project).filter(Project.status == "解析中").all()
        for p in stuck:
            logger.info(f"Re-triggering parsing for stuck project: {p.id}")
            asyncio.create_task(simulate_parsing(p.id, sse_manager))
    finally:
        db.close()

    yield
    # Shutdown
    logger.info("Drama Factory backend shutting down.")


app = FastAPI(
    title="短剧翻拍本地化重制工厂 API",
    description="Backend API for Short Drama Remake Localization Factory MVP",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static files (uploaded assets) ──────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(projects.router)
app.include_router(assets.router)
app.include_router(slices.router)
app.include_router(audio.router)
app.include_router(export.router)
app.include_router(sse.router)
app.include_router(upload.router)


@app.get("/")
def root():
    return {
        "service": "短剧翻拍本地化重制工厂",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
