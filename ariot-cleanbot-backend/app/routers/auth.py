import io
import logging
import time
from typing import Annotated, Any

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

import app.auth as auth_config
import app.supabase as supabase_config
from app.auth import User, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

AVATAR_BUCKET = "avatars"
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_MAX_DIMENSION = 512
AVATAR_URL_TTL_SECONDS = 3600
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=1024)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if len(value.strip()) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return value.strip()


class LoginRequest(StrictModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class UpdateProfileRequest(StrictModel):
    name: str = Field(min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if len(value.strip()) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return value.strip()


class ChangePasswordRequest(StrictModel):
    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=8, max_length=1024)


def _signed_avatar_url(avatar_path: str | None) -> str | None:
    if not avatar_path:
        return None
    try:
        response = (
            supabase_config.get_service_client()
            .storage.from_(AVATAR_BUCKET)
            .create_signed_url(avatar_path, AVATAR_URL_TTL_SECONDS)
        )
        if isinstance(response, dict):
            return response.get("signedURL") or response.get("signedUrl") or response.get("signed_url")
        return getattr(response, "signed_url", None)
    except Exception:
        logging.exception("Could not create a signed avatar URL")
        return None


def _profile_response(user: User) -> dict[str, Any]:
    return {
        **user.to_dict(),
        "avatar_url": _signed_avatar_url(user.avatar_path),
    }


def _looks_like_duplicate_error(exc: Exception) -> bool:
    code = getattr(exc, "code", None) or getattr(exc, "error_code", None)
    if code in {"email_exists", "user_already_exists"}:
        return True
    message = str(exc).lower()
    return any(
        marker in message
        for marker in (
            "already registered",
            "already been registered",
            "already exists",
            "duplicate",
            "user_already_exists",
        )
    )


def _is_email_send_rate_limit_error(exc: Exception) -> bool:
    code = getattr(exc, "code", None) or getattr(exc, "error_code", None)
    status = getattr(exc, "status", None) or getattr(exc, "status_code", None)
    return code == "over_email_send_rate_limit" or (
        status == 429 and "email rate limit" in str(exc).lower()
    )


def _normalize_avatar(raw: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(raw)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Unsupported source image format")
            if source.width * source.height > 16_000_000:
                raise ValueError("Image dimensions are too large")
            source.load()
            normalized = ImageOps.exif_transpose(source)
            if normalized.mode in ("RGBA", "LA") or "transparency" in normalized.info:
                rgba = normalized.convert("RGBA")
                background = Image.new("RGB", rgba.size, (255, 255, 255))
                background.paste(rgba, mask=rgba.getchannel("A"))
                normalized = background
            else:
                normalized = normalized.convert("RGB")
            normalized.thumbnail(
                (AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION),
                Image.Resampling.LANCZOS,
            )
            output = io.BytesIO()
            normalized.save(output, format="WEBP", quality=88, method=6)
            return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image")


@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    if auth_config._DEV_MODE:
        return {
            "user": {
                "id": "dev-user-001",
                "email": str(payload.email),
                "name": payload.name,
            },
        }

    try:
        service_client = supabase_config.get_service_client()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Registration is not configured")
    try:
        created = service_client.auth.admin.create_user(
            {
                "email": str(payload.email),
                "password": payload.password,
                "email_confirm": True,
            }
        )
    except Exception as exc:
        if _looks_like_duplicate_error(exc):
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists",
            )
        if _is_email_send_rate_limit_error(exc):
            logging.warning("Supabase signup email rate limit reached")
            raise HTTPException(
                status_code=429,
                detail="Registration is temporarily unavailable. Please try again later.",
            )
        logging.error("Supabase signup failed")
        raise HTTPException(status_code=502, detail="Unable to create account")

    user = getattr(created, "user", None)
    if not user:
        logging.error("Supabase admin user creation returned no user")
        raise HTTPException(status_code=502, detail="Unable to create account")
    try:
        service_client.table("profiles").insert(
            {
                "id": user.id,
                "name": payload.name,
                "email": str(payload.email),
                "role": "viewer",
                "facility_id": None,
                "avatar_path": None,
            }
        ).execute()
    except Exception:
        logging.exception("Profile provisioning failed after auth signup")
        try:
            service_client.auth.admin.delete_user(str(user.id))
        except Exception:
            logging.error("Could not roll back auth user after profile provisioning failure")
        raise HTTPException(status_code=500, detail="Account profile could not be created")

    return {
        "user": {
            "id": str(user.id),
            "email": str(payload.email),
            "name": payload.name,
        },
    }


@router.post("/login")
def login(payload: LoginRequest):
    if auth_config._DEV_MODE:
        if not auth_config.DEV_JWT_SECRET:
            raise HTTPException(
                status_code=503,
                detail="Development authentication is not configured",
            )
        now = int(time.time())
        claims = {
            "sub": "dev-user-001",
            "email": str(payload.email),
            "name": str(payload.email).split("@")[0],
            "role": "admin",
            "facility_id": None,
            "aud": auth_config.AUDIENCE,
            "iat": now,
            "exp": now + 86400,
        }
        token = jwt.encode(
            claims,
            auth_config.DEV_JWT_SECRET,
            algorithm=auth_config.DEV_ALGORITHM,
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": claims["sub"], "email": claims["email"]},
        }

    try:
        request_client = supabase_config.create_request_client()
        result = request_client.auth.sign_in_with_password(
            {"email": str(payload.email), "password": payload.password}
        )
        session = result.session
        if not session:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "user": {"id": result.user.id, "email": result.user.email},
        }
    except HTTPException:
        raise
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _profile_response(user)


@router.patch("/me")
def update_profile(payload: UpdateProfileRequest, user: User = Depends(get_current_user)):
    try:
        service_client = supabase_config.get_service_client()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Profile service is not configured")
    try:
        response = (
            service_client
            .table("profiles")
            .update({"name": payload.name})
            .eq("id", user.id)
            .execute()
        )
    except Exception:
        logging.exception("Profile update failed")
        raise HTTPException(status_code=502, detail="Unable to update profile")

    row = response.data[0] if response.data else None
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    updated = User(
        id=str(row.get("id", user.id)),
        name=row.get("name", payload.name),
        email=row.get("email", user.email),
        role=row.get("role", user.role),
        facility_id=row.get("facility_id", user.facility_id),
        avatar_path=row.get("avatar_path", user.avatar_path),
    )
    return _profile_response(updated)


@router.post("/me/avatar")
async def upload_avatar(
    file: Annotated[UploadFile, File(...)],
    user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Avatar must be a JPEG, PNG, or WebP image",
        )

    raw = await file.read(AVATAR_MAX_BYTES + 1)
    await file.close()
    if len(raw) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Avatar must be 2 MB or smaller")
    normalized = _normalize_avatar(raw)
    object_path = f"{user.id}/avatar.webp"

    try:
        service_client = supabase_config.get_service_client()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Avatar storage is not configured")
    try:
        service_client.storage.from_(AVATAR_BUCKET).upload(
            object_path,
            normalized,
            {"content-type": "image/webp", "upsert": "true"},
        )
        response = (
            service_client.table("profiles")
            .update({"avatar_path": object_path})
            .eq("id", user.id)
            .execute()
        )
        if not response.data:
            raise LookupError("Profile not found")
    except LookupError:
        raise HTTPException(status_code=404, detail="Profile not found")
    except Exception:
        logging.exception("Avatar upload failed")
        raise HTTPException(status_code=502, detail="Unable to upload avatar")

    avatar_url = _signed_avatar_url(object_path)
    if not avatar_url:
        raise HTTPException(status_code=502, detail="Unable to create avatar URL")
    return {"avatar_url": avatar_url}


@router.patch("/password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
):
    try:
        request_client = supabase_config.create_request_client()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    try:
        result = request_client.auth.sign_in_with_password(
            {"email": user.email, "password": payload.current_password}
        )
        if not getattr(result, "session", None):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    try:
        request_client.auth.update_user({"password": payload.new_password})
    except Exception:
        logging.error("Password provider update failed")
        raise HTTPException(status_code=502, detail="Unable to change password")

    return {"success": True}
