import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import robots
from app.routers import events
from app.routers import notifications
from app.routers import dashboard
from app.routers import robot_situation
from app.routers import cleaning
from app.routers import auth
from app.routers import simulator
from app.routers import facilities

app = FastAPI(
    title="ARIOT CleanBot API"
)

_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_allowed_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(robots.router)
app.include_router(events.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(robot_situation.router)
app.include_router(cleaning.router)
app.include_router(auth.router)
app.include_router(simulator.router)
app.include_router(facilities.router)


@app.get("/")
def home():
    return {
        "message": "ARIOT CleanBot Backend Running"
    }
