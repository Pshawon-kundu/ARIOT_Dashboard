import logging
import os
import time
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

import app.supabase as _supabase

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")
DEV_JWT_SECRET = os.getenv("DEV_JWT_SECRET")
PRODUCTION_ALGORITHM = "ES256"
DEV_ALGORITHM = "HS256"
AUDIENCE = "authenticated"
ISSUER = f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None
JWT_CLOCK_SKEW_SECONDS = 5

_DEV_MODE = not SUPABASE_URL or not SUPABASE_JWKS_URL
if _DEV_MODE:
    if DEV_JWT_SECRET:
        logging.warning(
            "Supabase JWKS configuration is incomplete; verified development JWT mode is active."
        )
    else:
        logging.error(
            "Development auth is unavailable because DEV_JWT_SECRET is not configured."
        )

bearer = HTTPBearer(auto_error=False)
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not SUPABASE_JWKS_URL:
            raise HTTPException(status_code=401, detail="Authentication is not configured")
        _jwks_client = PyJWKClient(SUPABASE_JWKS_URL)
    return _jwks_client


class User:
    def __init__(
        self,
        id: str,
        name: str,
        email: str,
        role: str,
        facility_id: str | None = None,
        avatar_path: str | None = None,
    ):
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.facility_id = facility_id
        self.avatar_path = avatar_path

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "facility_id": self.facility_id,
        }


def decode_token(token: str) -> dict:
    """Verify either a local HS256 development JWT or a Supabase ES256 JWT."""
    try:
        if _DEV_MODE:
            if not DEV_JWT_SECRET:
                raise HTTPException(
                    status_code=503,
                    detail="Development authentication is not configured",
                )
            claims = jwt.decode(
                token,
                DEV_JWT_SECRET,
                algorithms=[DEV_ALGORITHM],
                audience=AUDIENCE,
                leeway=JWT_CLOCK_SKEW_SECONDS,
                options={"require": ["sub", "exp", "aud"]},
            )
            if float(claims["exp"]) <= time.time():
                raise jwt.ExpiredSignatureError
            return claims

        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=[PRODUCTION_ALGORITHM],
            audience=AUDIENCE,
            issuer=ISSUER,
            leeway=JWT_CLOCK_SKEW_SECONDS,
        )
        if float(claims["exp"]) <= time.time():
            raise jwt.ExpiredSignatureError
        return claims
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        logging.exception("JWT verification failed")
        raise HTTPException(status_code=401, detail="Token verification failed")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    claims = decode_token(credentials.credentials)
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    if _DEV_MODE:
        role = claims.get("role") or "viewer"
        return User(
            id=str(sub),
            name=claims.get("name") or claims.get("email") or "Dev User",
            email=claims.get("email") or "",
            role=role,
            facility_id=claims.get("facility_id"),
            avatar_path=claims.get("avatar_path"),
        )

    try:
        client = _supabase.get_service_client()
        response = client.table("profiles").select(
            "id,name,email,role,facility_id,avatar_path"
        ).eq("id", sub).execute()
    except RuntimeError:
        logging.error("Profile lookup unavailable: service-role client is not configured")
        raise HTTPException(status_code=503, detail="Profile service is not configured")
    except Exception:
        logging.exception("Profile lookup failed")
        raise HTTPException(status_code=503, detail="Unable to load user profile")

    profile = response.data[0] if response.data else None
    if not profile:
        raise HTTPException(status_code=403, detail="User profile is not provisioned")

    return User(
        id=str(profile["id"]),
        name=profile.get("name") or "",
        email=profile.get("email") or "",
        role=profile.get("role") or "viewer",
        facility_id=profile.get("facility_id"),
        avatar_path=profile.get("avatar_path"),
    )
