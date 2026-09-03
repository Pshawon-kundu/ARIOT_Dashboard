"""Entry point for the ARIOT CleanBot Digital Twin Simulator.

Usage:
    python run.py
    python run.py --host 0.0.0.0 --port 8100
"""
from __future__ import annotations

import argparse

import uvicorn

from app.main import create_app
from app.core.config import get_config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ARIOT CleanBot Digital Twin Simulator API"
    )
    parser.add_argument("--host", help="bind host (default: config.yaml)")
    parser.add_argument("--port", type=int, help="bind port (default: config.yaml)")
    parser.add_argument("--reload", action="store_true", help="dev auto-reload")
    args = parser.parse_args()

    config = get_config()
    host = args.host or config.api.host
    port = args.port or config.api.port

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()