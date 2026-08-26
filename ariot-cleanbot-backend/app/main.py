from fastapi import FastAPI

from app.routers import robots
from app.routers import events
from app.routers import notifications
from app.routers import dashboard
from app.routers import robot_situation
from app.routers import cleaning
from app.routers import auth

app = FastAPI(
    title="ARIOT CleanBot API"
)

app.include_router(robots.router)
app.include_router(events.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(robot_situation.router)
app.include_router(cleaning.router)
app.include_router(auth.router)


@app.get("/")
def home():
    return {
        "message": "ARIOT CleanBot Backend Running"
    }
