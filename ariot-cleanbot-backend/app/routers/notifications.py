from fastapi import APIRouter, Depends
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_notifications():
    response = (
        supabase
        .table("notifications")
        .select("*")
        .execute()
    )

    return response.data


@router.post("/")
def create_notification(notification: dict):
    response = (
        supabase
        .table("notifications")
        .insert(notification)
        .execute()
    )

    return response.data
