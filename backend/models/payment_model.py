from sqlalchemy import Column, Integer, String
from sqlalchemy import ForeignKey, DateTime
from datetime import datetime

from database.connection import Base


class Payment(Base):

    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    order_id = Column(
        Integer,
        ForeignKey("orders.id")
    )

    amount = Column(Integer)

    payment_method = Column(String)

    payment_status = Column(
        String,
        default="pending_payment"
    )

    transaction_id = Column(
        String,
        nullable=True
    )

    paid_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )