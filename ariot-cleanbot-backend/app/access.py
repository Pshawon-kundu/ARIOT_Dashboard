from fastapi import HTTPException

from app import supabase as _sb


def get_registered_robot(
    robot_id: str,
    columns: str = "id,facility_id",
) -> dict:
    """Return a registered robot or a generic 404."""
    if _sb.supabase is None:
        return {"id": robot_id, "facility_id": None}

    try:
        response = (
            _sb.supabase.table("robots")
            .select(columns)
            .eq("id", robot_id)
            .execute()
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to load robot data")

    if not response.data:
        raise HTTPException(status_code=404, detail="Robot not found")
    return response.data[0]
