# Authentication via Clerk JWT verification

from fastapi import Depends, HTTPException, status
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings
from .logging import get_logger

logger = get_logger(__name__)


def _clerk_guard() -> ClerkHTTPBearer:
    settings = get_settings()
    if not settings.clerk_jwks_url:
        raise RuntimeError("CLERK_JWKS_URL is not set; cannot verify tokens")
    return ClerkHTTPBearer(ClerkConfig(jwks_url=settings.clerk_jwks_url))


clerk_guard = _clerk_guard()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(clerk_guard),
) -> str:
    sub = credentials.decoded.get("sub")
    if not sub:
        logger.warning("missing_sub_in_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )
    return sub