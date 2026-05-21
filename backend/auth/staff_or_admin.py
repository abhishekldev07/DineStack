from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from database.dependencies import get_db
from models.user_model import User


def staff_or_admin(request: Request, db: Session = Depends(get_db)):
    # Enforce role from database (source of truth) rather than token claims.
    payload = getattr(request.state, "user", None) or {}
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Only staff or admin allowed")