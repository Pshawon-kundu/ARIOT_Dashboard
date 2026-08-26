import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import app.supabase as _supabase

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"
AUDIENCE = "authenticated"

ROLES = ["admin", "facility_manager", "operator", "viewer"]

bearer = HTTPBearer(auto_error=False)


class User:
    def __init__(self, id, name, email, role, facility_id=None):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.facility_id = facility_id

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "facility_id": self.facility_id,
        }


def decode_token(token: str) -> dict:
    """Verify a Supabase JWT (HS256 signed with the JWT secret)."""
    if not JWT_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Auth not configured (missing SUPABASE_JWT_SECRET)",
        )
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
            audience=AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    claims = decode_token(credentials.credentials)
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    client = _supabase.supabase
    profile = None
    try:
        resp = (
            client.table("profiles")
            .select("*")
            .eq("id", sub)
            .execute()
        )
        profile = resp.data[0] if resp.data else None
    except Exception:
        profile = None

    if profile:
        return User(
            id=profile.get("id", sub),
            name=profile.get("name"),
            email=profile.get("email"),
            role=profile.get("role", "viewer"),
            facility_id=profile.get("facility_id"),
        )

    # Fallback to token claims when the profile row is not present yet.
    return User(
        id=sub,
        name=claims.get("name") or claims.get("email") or sub,
        email=claims.get("email") or "",
        role=claims.get("role") or "viewer",
        facility_id=None,
    )


def require_role(*roles: str):
    def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient privileges for this operation",
            )
        return user

    return checker
