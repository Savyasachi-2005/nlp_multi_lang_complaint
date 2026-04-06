from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from app.routes.complaint import router as complaint_router
except ModuleNotFoundError:
    from routes.complaint import router as complaint_router

app = FastAPI(
    title="Multilingual NLP Complaint Processing API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaint_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
