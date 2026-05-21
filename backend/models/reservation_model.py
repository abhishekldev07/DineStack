from sqlalchemy import Column, Integer, String, Date, Time, DateTime, Float, ForeignKey
from sqlalchemy.sql import func

from database.connection import Base


class Reservation(Base):

    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)

    reservation_id = Column(String, unique=True, index=True, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    customer_name = Column(String, nullable=False)

    phone_number = Column(String, nullable=False, index=True)

    guest_count = Column(Integer, nullable=False)

    reservation_date = Column(Date, nullable=False, index=True)

    reservation_time = Column(Time, nullable=False)

    reservation_end_time = Column(Time, nullable=False)

    status = Column(String, nullable=False, default="pending", index=True)

    special_request = Column(String, nullable=True)

    assigned_table = Column(String, nullable=True)

    payment_status = Column(String, nullable=False, default="pending_payment")

    payment_method = Column(String, nullable=True)

    transaction_id = Column(String, nullable=True)

    paid_amount = Column(Float, nullable=False, default=0)

    paid_at = Column(DateTime(timezone=True), nullable=True)

    reminder_status = Column(String, nullable=False, default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )