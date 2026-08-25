"""Vercel function entry point for the FastAPI backend.

The application code stays in ``backend/app`` so local development can keep
using ``uvicorn backend.app.main:app``. Vercel discovers this root-level
``api/index.py`` module and serves every rewritten /api request from it.
"""

from backend.app.main import app

