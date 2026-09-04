from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.supabase import supabase
from app.auth import User, get_current_user, require_role

router = APIRouter(
    prefix="/facilities",
    tags=["Facilities"],
    dependencies=[Depends(get_current_user)],
)


class FacilityCreate(BaseModel):
    name: str
    location: str | None = None


class FacilityUpdate(BaseModel):
    name: str | None = None
    location: str | None = None


def _facility_row(facility: dict) -> dict:
    return {
        "id": facility.get("id"),
        "name": facility.get("name"),
        "location": facility.get("location"),
        "created_at": facility.get("created_at"),
    }


@router.get("")
def list_facilities(user: User = Depends(get_current_user)):
    try:
        if user.role == "admin":
            resp = (
                supabase.table("facilities")
                .select("id, name, location, created_at")
                .execute()
            )
        else:
            if not user.facility_id:
                return []
            resp = (
                supabase.table("facilities")
                .select("id, name, location, created_at")
                .eq("id", user.facility_id)
                .execute()
            )
        return [_facility_row(f) for f in (resp.data or [])]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.get("/{facility_id}")
def get_facility(facility_id: str, user: User = Depends(get_current_user)):
    if user.role != "admin" and str(user.facility_id) != str(facility_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this facility",
        )

    try:
        fac_resp = (
            supabase.table("facilities")
            .select("id, name, location, created_at")
            .eq("id", facility_id)
            .execute()
        )
        if not fac_resp.data:
            raise HTTPException(status_code=404, detail="Facility not found")

        facility = fac_resp.data[0]

        floors_resp = (
            supabase.table("floors")
            .select("id, name")
            .eq("facility_id", facility_id)
            .execute()
        )
        floors = [
            {"id": f.get("id"), "name": f.get("name")}
            for f in (floors_resp.data or [])
        ]

        robots_resp = (
            supabase.table("robots")
            .select("id, name, status")
            .eq("facility_id", facility_id)
            .execute()
        )
        robots = [
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "status": r.get("status"),
            }
            for r in (robots_resp.data or [])
        ]

        result = _facility_row(facility)
        result["floors"] = floors
        result["robots"] = robots
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.post("")
def create_facility(
    payload: FacilityCreate,
    user: User = Depends(require_role("admin")),
):
    try:
        resp = (
            supabase.table("facilities")
            .insert({"name": payload.name, "location": payload.location})
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=503, detail="Failed to create facility")
        return _facility_row(resp.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.put("/{facility_id}")
def update_facility(
    facility_id: str,
    payload: FacilityUpdate,
    user: User = Depends(require_role("admin", "facility_manager")),
):
    if (
        user.role == "facility_manager"
        and str(user.facility_id) != str(facility_id)
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only update your assigned facility",
        )

    try:
        exists = (
            supabase.table("facilities").select("id").eq("id", facility_id).execute()
        )
        if not exists.data:
            raise HTTPException(status_code=404, detail="Facility not found")

        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        resp = (
            supabase.table("facilities")
            .update(updates)
            .eq("id", facility_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=503, detail="Failed to update facility")
        return _facility_row(resp.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.delete("/{facility_id}")
def delete_facility(
    facility_id: str,
    user: User = Depends(require_role("admin")),
):
    try:
        exists = (
            supabase.table("facilities").select("id").eq("id", facility_id).execute()
        )
        if not exists.data:
            raise HTTPException(status_code=404, detail="Facility not found")

        supabase.table("facilities").delete().eq("id", facility_id).execute()
        return {"id": facility_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")
