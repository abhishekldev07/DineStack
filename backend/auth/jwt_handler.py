import os
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4

from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dinestacksecretkey")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "dinestack-refresh-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def _now_utc():
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = _now_utc() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire,
            "iat": _now_utc(),
            "type": "access"
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: dict):

    to_encode = data.copy()
    expires_at = _now_utc() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token_id = uuid4().hex

    to_encode.update(
        {
            "exp": expires_at,
            "iat": _now_utc(),
            "jti": token_id,
            "type": "refresh"
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        REFRESH_SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt, expires_at, token_id


def decode_refresh_token(token: str):

    payload = jwt.decode(
        token,
        REFRESH_SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    if payload.get("type") != "refresh":
        raise JWTError("Invalid refresh token type")

    return payload