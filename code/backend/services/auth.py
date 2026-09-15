"""Password hashing, JWT issuing/verification, and auth dependencies.

Access tokens are short-lived (30 min); refresh tokens longer-lived (7 days)
and rotated on every use. Revocation works without a token blacklist table:
each token embeds the user's token_version at issue time, and bumping
User.token_version invalidates every outstanding access and refresh token
for that user immediately.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from db.models import User
from db.session import get_session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(user: User, token_type: Literal["access", "refresh"], expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": token_type,
        "ver": user.token_version,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(user: User) -> str:
    return _create_token(user, "access", timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user: User) -> str:
    return _create_token(user, "refresh", timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


class TokenError(Exception):
    pass


def decode_token(token: str, expected_type: Literal["access", "refresh"]) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise TokenError(f"Invalid or expired token: {exc}") from None

    if payload.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token.")
    return payload


def _load_and_verify_user(payload: dict, session: Session) -> User:
    user_id = payload.get("sub")
    user = session.get(User, int(user_id)) if user_id else None
    if user is None:
        raise TokenError("User no longer exists.")
    if payload.get("ver") != user.token_version:
        raise TokenError("Token has been revoked (password changed or logged out).")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        return _load_and_verify_user(payload, session)
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from None