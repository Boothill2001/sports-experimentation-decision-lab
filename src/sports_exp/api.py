from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sports_exp.config import PUBLIC_DIR
from sports_exp.pages import portfolio_payload

app = FastAPI(title="Sports Experimentation Decision Lab", version="0.1.0")


@app.get("/api/health")
def health() -> dict[str, object]:
    return {"status": "ok", "mode": "local", "synthetic": True, "seed": 42}


@app.get("/api/portfolio")
def portfolio() -> dict[str, object]:
    return portfolio_payload()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "index.html")


app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="public")

