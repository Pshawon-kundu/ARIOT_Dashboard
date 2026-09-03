from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Robot(BaseModel):
    id: Optional[str] = None
    name: str
    status: Optional[str] = "idle"
    location: Optional[str] = None
    created_at: Optional[datetime] = None


class Event(BaseModel):
    id: Optional[str] = None
    robot_id: str
    event_type: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class Notification(BaseModel):
    id: Optional[str] = None
    robot_id: Optional[str] = None
    message: str
    read: Optional[bool] = False
    created_at: Optional[datetime] = None


class DashboardMetrics(BaseModel):
    total_robots: int
    active_cleaning: int
    attention_required: int
    cleaning_progress_today: int
    area_cleaned_today: int
    facility_status: str
