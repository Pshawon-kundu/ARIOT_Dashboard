from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Robot(BaseModel):
    id: Optional[int] = None
    name: str
    status: Optional[str] = "idle"
    location: Optional[str] = None
    created_at: Optional[datetime] = None


class Event(BaseModel):
    id: Optional[int] = None
    robot_id: int
    event_type: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class Notification(BaseModel):
    id: Optional[int] = None
    robot_id: Optional[int] = None
    message: str
    read: Optional[bool] = False
    created_at: Optional[datetime] = None
