"""
Interview Vault - Python 3.11 FastAPI Backend
Main application entry point
"""
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from config import settings

# Import routers
from routers import email, auth, ai, utils, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    print(" Interview Vault Python Backend starting...")
    print(f"   Environment: {settings.NODE_ENV}")
    print(f"   Port: {settings.PORT}")
    
    # Validate environment variables
    validation = settings.validate()
    for key, is_set in validation.items():
        status = "" if is_set else ""
        print(f"   {status} {key}: {'Found' if is_set else 'Missing'}")
    
    yield
    
    # Shutdown
    print(" Interview Vault Python Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Interview Vault API",
    description="Python backend for Interview Vault - AI-powered job application tracker",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (same as Node.js cors())
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(email.router, prefix="/api", tags=["Email"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(ai.router, prefix="/api", tags=["AI"])
app.include_router(utils.router, prefix="/api", tags=["Utils"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "interview-vault-python",
        "version": "1.0.0",
        "environment": settings.NODE_ENV
    }


# Serve React frontend in production
if settings.is_production():
    # Path to React build (dist folder in parent directory)
    dist_path = Path(__file__).parent.parent / "dist"
    
    if dist_path.exists():
        # Serve static files
        app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")
        
        @app.get("/{full_path:path}")
        async def serve_react(request: Request, full_path: str):
            """Serve React app for all non-API routes"""
            # Skip API routes
            if full_path.startswith("api/"):
                return JSONResponse({"error": "Not found"}, status_code=404)
            
            # Try to serve the requested file
            file_path = dist_path / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
            
            # Fallback to index.html for React Router
            index_file = dist_path / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
            
            return JSONResponse({"error": "Not found"}, status_code=404)
        
        print(" Serving React build from /dist")


# Run with uvicorn in development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=not settings.is_production()
    )
