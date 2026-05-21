from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from database.dependencies import get_db

from models.payment_model import Payment

from schemas.payment_schema import PaymentStatusUpdate

from auth.auth_bearer import JWTBearer
from auth.staff_or_admin import staff_or_admin


router = APIRouter()


@router.put(
    "/payments/{payment_id}/status",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def update_payment_status(
    payment_id: int,
    data: PaymentStatusUpdate,
    db: Session = Depends(get_db)
):

    payment = db.query(Payment).filter(
        Payment.id == payment_id
    ).first()

    if not payment:
        return {
            "error": "Payment not found"
        }

    payment.payment_status = data.payment_status

    if data.transaction_id:
        payment.transaction_id = data.transaction_id

    db.commit()
    db.refresh(payment)

    return {
        "message": "Payment status updated successfully",
        "payment_id": payment.id,
        "payment_status": payment.payment_status,
        "transaction_id": payment.transaction_id
    }