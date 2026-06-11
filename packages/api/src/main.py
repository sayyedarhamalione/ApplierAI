"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import jobs, apply, profile, status

app = FastAPI(
    title="Job Applier 2026 API",
    version="0.1.0",
    description="Backend API for job application automation dashboard",
)

# CORS for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(apply.router, prefix="/api/apply", tags=["apply"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(status.router, prefix="/api/applications", tags=["applications"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
