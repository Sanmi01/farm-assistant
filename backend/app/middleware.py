# HTTP middleware: per-request ID for log correlation.

import uuid

import structlog
from fastapi import Request


async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())

    structlog.contextvars.bind_contextvars(request_id=request_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        structlog.contextvars.unbind_contextvars("request_id")