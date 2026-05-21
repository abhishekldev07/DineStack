from pydantic import BaseModel
from typing import Literal


class PaymentStatusUpdate(BaseModel):

    payment_status: Literal[
        "pending_payment",
        "pending",
        "paid",
        "cancelled",
        "failed",
        "refunded"
    ]

    transaction_id: str | None = None   