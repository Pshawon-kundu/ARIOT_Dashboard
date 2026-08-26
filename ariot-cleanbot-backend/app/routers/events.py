from fastapi import APIRouter, Depends
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/events",
    tags=["Events"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_events():
    response = (
        supabase
        .table("events")
        .select("*")
        .execute()
    )

    return response.data


@router.post("/")
def create_event(event: dict):
    response = (
        supabase
        .table("events")
        .insert(event)
        .execute()
    )

    return response.data
