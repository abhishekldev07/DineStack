import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database.dependencies import get_db
from models.refresh_token_model import RefreshToken
from models.user_model import User
from schemas.user_schema import UserCreate
from auth.auth_utils import hash_password

from passlib.context import CryptContext
from schemas.user_schema import (
    AuthSessionResponse,
    LogoutRequest,
    RefreshTokenRequest,
    ResendVerification,
    ResetPassword,
    ChangePassword,
    UserLogin
)
from auth.jwt_handler import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token
)

from auth.email_utils import send_reset_email, send_verification_email
from jose import JWTError, ExpiredSignatureError, jwt
from datetime import datetime, timedelta, timezone
import hmac
import secrets

from auth.auth_bearer import JWTBearer
import logging
from fastapi import Request

router = APIRouter()
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
VERIFICATION_SECRET = os.getenv("VERIFICATION_SECRET", SECRET_KEY)
RESET_PASSWORD_SECRET = os.getenv("RESET_PASSWORD_SECRET", SECRET_KEY)
VERIFICATION_ALGORITHM = "HS256"
VERIFICATION_TOKEN_MINUTES = int(os.getenv("VERIFICATION_TOKEN_MINUTES", "60"))


def build_auth_user(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


def issue_refresh_session(db: Session, user: User):
    refresh_token, expires_at, jti = create_refresh_token(
        {
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    refresh_record = RefreshToken(
        user_id=user.id,
        jti=jti,
        token=hash_token(refresh_token),
        expires_at=expires_at,
        revoked=False,
        revoked_at=None,
        replaced_by_jti=None
    )

    db.add(refresh_record)
    db.commit()
    db.refresh(refresh_record)

    return refresh_token, refresh_record


def build_verification_payload(email: str):
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_TOKEN_MINUTES)
    return {
        "email": email,
        "purpose": "email_verification",
        "nonce": secrets.token_urlsafe(16),
        "exp": expires_at
    }, expires_at
@router.post("/register")
async def register_user(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        (User.email == user.email) |
        (User.username == user.username)
    ).first()

    if existing_user:
        raise HTTPException(status_code=409, detail="Email or username already exists")

    hashed_pw = hash_password(user.password)

    verification_payload, verification_expires = build_verification_payload(user.email)
    verification_token = jwt.encode(
        verification_payload,
        VERIFICATION_SECRET,
        algorithm=VERIFICATION_ALGORITHM
    )
    logger.info("Registration verification token generated for %s", user.email)

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pw,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires=verification_expires,
        role="customer"
    )

    # ... Database save and logging above remains exactly the same ...
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # --- UPDATED TO USE BACKGROUND TASKS ---
    logger.info("Enqueuing verification email in background for %s", new_user.email)
    background_tasks.add_task(
        send_verification_email,
        new_user.email,
        f"{FRONTEND_URL}/verify-email?token={verification_token}"
    )
    logger.info("Registration API response returning immediately for %s", new_user.email)

    return {
        "message": "Verification email sent. Please verify your email before logging in."
    }

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    valid_password = pwd_context.verify(
        user.password,
        existing_user.hashed_password
    )

    if not valid_password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not existing_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in."
        )

    access_token = create_access_token(
        data={
            "user_id": existing_user.id,
            "email": existing_user.email,
            "role": existing_user.role
        }
    )

    refresh_token, _refresh_record = issue_refresh_session(db, existing_user)

    return AuthSessionResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=build_auth_user(existing_user)
    ).model_dump(mode="json")


@router.post("/refresh-token")
def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    if not payload.refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token is required")

    try:
        token_payload = decode_refresh_token(payload.refresh_token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_jti = token_payload.get("jti")
    user_id = token_payload.get("user_id")

    if not token_jti or not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_record = db.query(RefreshToken).filter(
        RefreshToken.jti == token_jti,
        RefreshToken.user_id == user_id
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if token_record.revoked:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    if token_record.token != hash_token(payload.refresh_token):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    now = datetime.now(timezone.utc)
    if token_record.expires_at and token_record.expires_at < now:
        token_record.revoked = True
        token_record.revoked_at = now
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    new_refresh_token, new_expires_at, new_jti = create_refresh_token(
        {
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    token_record.revoked = True
    token_record.revoked_at = now
    token_record.replaced_by_jti = new_jti

    replacement_record = RefreshToken(
        user_id=user.id,
        jti=new_jti,
        token=hash_token(new_refresh_token),
        expires_at=new_expires_at,
        revoked=False,
        revoked_at=None,
        replaced_by_jti=None
    )

    db.add(replacement_record)
    db.commit()

    return AuthSessionResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=build_auth_user(user)
    ).model_dump(mode="json")


@router.post("/logout")
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db)
):
    if not payload.refresh_token:
        return {"message": "Logged out successfully"}

    try:
        token_payload = decode_refresh_token(payload.refresh_token)
    except JWTError:
        return {"message": "Logged out successfully"}

    token_jti = token_payload.get("jti")
    user_id = token_payload.get("user_id")

    if token_jti and user_id:
        token_record = db.query(RefreshToken).filter(
            RefreshToken.jti == token_jti,
            RefreshToken.user_id == user_id
        ).first()

        if token_record and not token_record.revoked:
            token_record.revoked = True
            token_record.revoked_at = datetime.now(timezone.utc)
            db.commit()

    return {"message": "Logged out successfully"}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):

    try:
        payload = jwt.decode(
            token,
            VERIFICATION_SECRET,
            algorithms=[VERIFICATION_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    if payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    if user.is_verified:
        return {
            "message": "Email verified successfully"
        }

    if not user.verification_token or user.verification_token != token:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    expires_at = user.verification_token_expires
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None

    db.commit()

    return {
        "message": "Email verified successfully"
    }


@router.get("/verification-status")
def verification_status(
    email: str,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email": user.email,
        "is_verified": bool(user.is_verified)
    }


@router.get("/me", dependencies=[Depends(JWTBearer())])
def current_user(request: Request, db: Session = Depends(get_db)):
    # Return authoritative user info from the database (do not trust role in token)
    payload = getattr(request.state, "user", None) or {}
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return build_auth_user(user)


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerification,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {
            "message": "Email is already verified"
        }

    verification_payload, verification_expires = build_verification_payload(user.email)
    verification_token = jwt.encode(
        verification_payload,
        VERIFICATION_SECRET,
        algorithm=VERIFICATION_ALGORITHM
    )
    logger.info("Resend verification token generated for %s", user.email)

    user.verification_token = verification_token
    user.verification_token_expires = verification_expires

    db.commit()

    logger.info("Starting resend verification email send for %s", user.email)
    await send_verification_email(
        user.email,
        f"{FRONTEND_URL}/verify-email?token={verification_token}"
    )
    logger.info("Resend verification email sent successfully for %s", user.email)

    return {
        "message": "Verification email sent. Please check your inbox."
    }

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
      raise HTTPException(
          status_code=404,
          detail="User not found"
    )

    reset_token = jwt.encode(
        {
            "email": user.email,
            "pwd_sig": user.hashed_password,
            "exp": datetime.utcnow() + timedelta(minutes=15)
        },
        RESET_PASSWORD_SECRET,
        algorithm="HS256"
    )

    reset_link = f"{FRONTEND_URL}/reset-password/{reset_token}"

    background_tasks.add_task(
        send_reset_email,
        user.email,
        reset_link
    )

    return {
        "message": "Password reset email sent"
    }

@router.post("/reset-password/{token}")
def reset_password(
    token: str,
    data: ResetPassword,
    db: Session = Depends(get_db)
):

    try:

        payload = jwt.decode(
            token,
            "dinestacksecretkey",
            algorithms=["HS256"]
        )

        email = payload.get("email")
        pwd_sig = payload.get("pwd_sig")

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_sig or not hmac.compare_digest(str(pwd_sig), str(user.hashed_password)):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    hashed_pw = hash_password(data.new_password)

    user.hashed_password = hashed_pw

    db.commit()

    return {
        "message": "Password reset successful"
    }


@router.post(
    "/change-password",
    dependencies=[Depends(JWTBearer())]
)
def change_password(
    request: Request,
    data: ChangePassword,
    db: Session = Depends(get_db)
):

    user_id = request.state.user["user_id"]

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = hash_password(data.new_password)

    db.commit()

    return {
        "message": "Password changed successfully"
    }