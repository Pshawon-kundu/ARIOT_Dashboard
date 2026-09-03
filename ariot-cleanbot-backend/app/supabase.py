import logging
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def _create_client(client_key: str):
    from supabase import create_client

    if not url:
        raise RuntimeError("SUPABASE_URL is not configured")
    return create_client(url, client_key)


supabase = None
if url and key:
    try:
        supabase = _create_client(key)
    except Exception as exc:
        logging.warning("Supabase client initialization failed: %s", exc)
else:
    logging.warning("SUPABASE_URL / SUPABASE_KEY not set - Supabase is disabled.")


def create_request_client():
    """Return an isolated anon-key client whose auth state is request-local."""
    if not key:
        raise RuntimeError("SUPABASE_KEY is not configured")
    return _create_client(key)


@lru_cache(maxsize=1)
def get_service_client():
    """Return the server-only client used for backend-mediated profile writes."""
    if not service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return _create_client(service_role_key)
