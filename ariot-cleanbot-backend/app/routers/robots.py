from fastapi import APIRouter, Depends
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/robots",
    tags=["Robots"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/")
def get_robots():
    response = (
        supabase
        .table("robots")
        .select("*")
        .execute()
    )

    return response.data
