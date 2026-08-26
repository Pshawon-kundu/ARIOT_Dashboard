from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import app.supabase as _supabase
from app.auth import ROLES, User, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "viewer"
    facility_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    client = _supabase.supabase
    try:
        created = client.auth.sign_up(
            {"email": payload.email, "password": payload.password}
        )
        user = created.user
        if not user:
            raise HTTPException(status_code=400, detail="Registration failed")

        uid = user.id
        client.table("profiles").insert(
            {
                "id": uid,
                "name": payload.name,
                "email": payload.email,
                "role": payload.role,
                "facility_id": payload.facility_id,
            }
        ).execute()

        return {
            "id": uid,
            "email": payload.email,
            "name": payload.name,
            "role": payload.role,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Registration error: {exc}")


@router.post("/login")
def login(payload: LoginRequest):
    client = _supabase.supabase
    try:
        result = client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
        session = result.session
        if not session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "user": {
                "id": result.user.id,
                "email": result.user.email,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Login failed: {exc}")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user.to_dict()
