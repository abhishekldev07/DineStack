import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import secrets

from jose import jwt

from database.dependencies import get_db
from models.user_model import User
from models.order_model import Order
from models.reservation_model import Reservation
from schemas.user_schema import UserCreate

from auth.auth_bearer import JWTBearer
from auth.role_checker import admin_required
from auth.auth_utils import hash_password
from auth.email_utils import send_verification_email
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
VERIFICATION_SECRET = os.getenv("VERIFICATION_SECRET", "dinestacksecretkey")
VERIFICATION_ALGORITHM = "HS256"
VERIFICATION_TOKEN_MINUTES = int(os.getenv("VERIFICATION_TOKEN_MINUTES", "60"))


def build_user_profile(db: Session, user: User):
    created_at = getattr(user, "created_at", None)

    if created_at is None:
        created_at = db.execute(
            text("SELECT created_at FROM users WHERE id = :user_id"),
            {"user_id": user.id}
        ).scalar()

    profile = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": created_at,
        "order_count": None,
        "reservation_count": None
    }

    if user.role == "customer":
        profile["order_count"] = db.query(Order).filter(Order.user_id == user.id).count()
        profile["reservation_count"] = db.query(Reservation).filter(Reservation.user_id == user.id).count()

    return profile


@router.post("/register")
async def register(
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

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_TOKEN_MINUTES)
    verification_payload = {
        "email": user.email,
        "purpose": "email_verification",
        "nonce": secrets.token_urlsafe(16),
        "exp": expires_at
    }
    verification_token = jwt.encode(
        verification_payload,
        VERIFICATION_SECRET,
        algorithm=VERIFICATION_ALGORITHM
    )
    logger.info("Registration verification token generated for %s", user.email)

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires=expires_at,
        role="customer"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("Starting verification email send for %s", new_user.email)
    await send_verification_email(
        new_user.email,
        f"{FRONTEND_URL}/verify-email?token={verification_token}"
    )
    logger.info("Verification email sent successfully for %s", new_user.email)

    return {
        "message": "Verification email sent. Please verify your email before logging in."
    }


@router.get(
    "/me/profile",
    dependencies=[Depends(JWTBearer())]
)
def get_my_profile(
    request: Request,
    db: Session = Depends(get_db)
):

    user_id = request.state.user["user_id"]
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return build_user_profile(db, user)


@router.get(
    "/admin/users/{user_id}/profile",
    dependencies=[Depends(JWTBearer()), Depends(admin_required)]
)
def get_admin_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return build_user_profile(db, user)


@router.put(
    "/users/promote/{user_id}",
    dependencies=[
        Depends(JWTBearer()),
        Depends(admin_required)
    ]
)
def promote_user(
    user_id: int,
    role: str,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        return {"error": "User not found"}
    if role not in ["staff", "admin"]:
        return {"error": "Invalid role"}

    user.role = role

    db.commit()

    return {
        "message": f"User promoted to {role}"
    }