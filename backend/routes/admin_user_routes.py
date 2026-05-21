from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import inspect

from database.dependencies import get_db
from models.user_model import User

from auth.auth_bearer import JWTBearer
from auth.role_checker import admin_required

from pydantic import BaseModel, ConfigDict
from typing import Literal

router = APIRouter()


class RoleUpdate(BaseModel):
    role: Literal["customer", "staff", "admin"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: Literal["customer", "staff", "admin"]


@router.get(
    "/admin/users",
    dependencies=[Depends(JWTBearer()), Depends(admin_required)]
)
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.asc()).all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": getattr(u, "created_at", None)
        }
        for u in users
    ]


@router.get(
    "/admin/users/search",
    dependencies=[Depends(JWTBearer()), Depends(admin_required)]
)
def search_users(
    id: int | None = Query(default=None),
    username: str | None = Query(default=None),
    email: str | None = Query(default=None),
    db: Session = Depends(get_db)
):

    if id is not None and id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    query = db.query(User)

    if id is not None:
        query = query.filter(User.id == id)

    if username:
        query = query.filter(User.username.ilike(f"%{username.strip()}%"))

    if email:
        query = query.filter(User.email.ilike(f"%{email.strip()}%"))

    users = query.order_by(User.id.asc()).all()

    user_columns = {column["name"] for column in inspect(db.bind).get_columns("users")}
    has_created_at = "created_at" in user_columns

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": getattr(user, "created_at", None) if has_created_at else None
        }
        for user in users
    ]


@router.patch(
    "/admin/users/{user_id}/role",
    dependencies=[Depends(JWTBearer()), Depends(admin_required)]
)
def update_user_role(user_id: int, payload: RoleUpdate, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role not in ["customer", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user.role = payload.role
    db.commit()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": getattr(user, "created_at", None)
    }
