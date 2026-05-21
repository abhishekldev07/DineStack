from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from database.dependencies import get_db
from models.user_model import User


def admin_required(request: Request, db: Session = Depends(get_db)):
    # Always verify role against the database (source of truth).
    payload = getattr(request.state, "user", None) or {}
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def staff_or_admin_required(request: Request, db: Session = Depends(get_db)):
    # Always verify role against the database (source of truth).
    payload = getattr(request.state, "user", None) or {}
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff or Admin access required")