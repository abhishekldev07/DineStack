from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Iterable, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth.auth_bearer import JWTBearer
from auth.staff_or_admin import staff_or_admin
from database.dependencies import get_db
from models.reservation_model import Reservation
from schemas.reservation_schema import (
    ReservationAnalyticsResponse,
    ReservationAnalyticsSlot,
    ReservationOccupancyWindow,
    ReservationAvailabilityResponse,
    ReservationAvailabilitySlot,
    ReservationCreate,
    ReservationListResponse,
    ReservationReminderReady,
    ReservationPaymentRequest,
    ReservationPaymentResponse,
    ReservationResponse,
    ReservationStatusUpdate,
    ReservationTableAssign,
    MAX_GUESTS_PER_RESERVATION,
)
from utils.reservation_time_utils import (
    RESTAURANT_CLOSE_TIME,
    RESTAURANT_OPEN_TIME,
    RESERVATION_DURATION_MINUTES,
    calculate_reservation_end_time,
    overlap_bucket_calculation,
)

router = APIRouter()

ACTIVE_STATUSES = {"pending", "confirmed"}
OCCUPANCY_STATUSES = ACTIVE_STATUSES | {"completed"}
FINAL_STATUSES = {"completed", "cancelled", "rejected"}
VALID_STATUSES = ACTIVE_STATUSES | FINAL_STATUSES
SLOT_INTERVAL_MINUTES = 30
RESTAURANT_CAPACITY = 40
MAX_UPCOMING_RESERVATIONS_PER_USER = 3
AVAILABLE_LIMIT_THRESHOLD = max(4, RESTAURANT_CAPACITY // 5)


def require_customer_access(request: Request):
    user = request.state.user

    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Customer access required")

    return user


def require_staff_access(request: Request):
    user = request.state.user

    if user["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Only staff or admin allowed")

    return user


def reservation_start(reservation_date: date, reservation_time: time) -> datetime:
    return datetime.combine(reservation_date, reservation_time)


def reservation_end(reservation_date: date, reservation_time: time) -> datetime:
    return datetime.combine(
        reservation_date,
        calculate_reservation_end_time(reservation_date, reservation_time)
    )


def slot_label(slot_start: datetime) -> str:
    return slot_start.strftime("%I:%M %p").lstrip("0")


def generate_reservation_id() -> str:
    return f"RSV-{datetime.utcnow():%Y%m%d}-{uuid4().hex[:6].upper()}"


def normalize_phone_number(value: str) -> str:
    normalized_value = (value or "").strip()

    if not normalized_value:
        raise ValueError("Phone number is required")

    if not normalized_value.isdigit():
        raise ValueError("Phone number must contain only numbers")

    if len(normalized_value) != 10:
        raise ValueError("Phone number must be exactly 10 digits")

    if not normalized_value.startswith(("98", "97")):
        raise ValueError("Phone number must start with 98 or 97")

    return normalized_value


def serialize_reservation(reservation: Reservation) -> dict:
    reminder_ready = ReservationReminderReady(
        sms_ready=bool(reservation.phone_number),
        email_ready=False,
        next_reminder_at=(
            reservation_start(reservation.reservation_date, reservation.reservation_time)
            - timedelta(hours=2)
            if reservation.status in ACTIVE_STATUSES
            else None
        )
    )

    payload = ReservationResponse.model_validate({
        "id": reservation.id,
        "reservation_id": reservation.reservation_id,
        "user_id": reservation.user_id,
        "customer_name": reservation.customer_name,
        "phone_number": reservation.phone_number,
        "guest_count": reservation.guest_count,
        "reservation_date": reservation.reservation_date,
        "reservation_time": reservation.reservation_time,
        "reservation_end_time": reservation.reservation_end_time,
        "status": reservation.status,
        "special_request": reservation.special_request,
        "assigned_table": reservation.assigned_table,
        "payment_status": reservation.payment_status,
        "payment_method": reservation.payment_method,
        "transaction_id": reservation.transaction_id,
        "paid_amount": reservation.paid_amount,
        "paid_at": reservation.paid_at,
        "reminder_status": reservation.reminder_status,
        "created_at": reservation.created_at,
        "updated_at": reservation.updated_at,
        "reminder_ready": reminder_ready
    })

    return payload.model_dump(mode="json")


def overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def build_day_slots(
    reservations: Iterable[Reservation],
    target_date: date,
    guest_count: int,
    counted_statuses: set[str],
) -> list[dict]:
    occupied_reservations = [
        reservation
        for reservation in reservations
        if reservation.status in counted_statuses
    ]

    slots: list[dict] = []
    current_start = datetime.combine(target_date, RESTAURANT_OPEN_TIME)
    last_start = datetime.combine(target_date, RESTAURANT_CLOSE_TIME) - timedelta(minutes=RESERVATION_DURATION_MINUTES)

    while current_start <= last_start:
        current_end = current_start + timedelta(minutes=SLOT_INTERVAL_MINUTES)

        booked_seats = sum(
            reservation.guest_count
            for reservation in occupied_reservations
            if overlap_bucket_calculation(
                current_start,
                current_end,
                reservation_start(reservation.reservation_date, reservation.reservation_time),
                reservation_end(reservation.reservation_date, reservation.reservation_time)
            )
        )

        remaining_seats = max(0, RESTAURANT_CAPACITY - booked_seats)

        if remaining_seats <= 0:
            status = "fully_booked"
        elif remaining_seats <= AVAILABLE_LIMIT_THRESHOLD:
            status = "limited"
        else:
            status = "available"

        slots.append({
            "slot_time": current_start.time(),
            "slot_label": current_start.strftime("%I:%M %p").lstrip("0"),
            "status": status,
            "booked_seats": booked_seats,
            "remaining_seats": remaining_seats,
            "can_book": remaining_seats >= guest_count and status != "fully_booked"
        })

        current_start += timedelta(minutes=SLOT_INTERVAL_MINUTES)

    return slots


def get_target_reservations_query(db: Session, target_date: date | None = None):
    query = db.query(Reservation)

    if target_date:
        query = query.filter(Reservation.reservation_date == target_date)

    return query


@router.get(
    "/reservations/availability",
    dependencies=[Depends(JWTBearer())]
)
def get_reservation_availability(
    request: Request,
    reservation_date: date = Query(...),
    guest_count: int = Query(1, ge=1, le=MAX_GUESTS_PER_RESERVATION),
    db: Session = Depends(get_db)
):
    require_customer_access(request)

    if reservation_date < date.today():
        raise HTTPException(status_code=400, detail="Reservation date cannot be in the past")

    reservations = get_target_reservations_query(db, reservation_date).filter(
        Reservation.status.in_(list(ACTIVE_STATUSES))
    ).all()

    slots = build_day_slots(reservations, reservation_date, guest_count, ACTIVE_STATUSES)

    return ReservationAvailabilityResponse.model_validate({
        "reservation_date": reservation_date,
        "guest_count": guest_count,
        "capacity": RESTAURANT_CAPACITY,
        "slots": slots
    }).model_dump(mode="json")


@router.post(
    "/reservations",
    dependencies=[Depends(JWTBearer())]
)
def create_reservation(
    payload: ReservationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_customer_access(request)

    normalized_phone = normalize_phone_number(payload.phone_number)
    reservation_start_dt = reservation_start(payload.reservation_date, payload.reservation_time)
    reservation_end_dt = reservation_end(payload.reservation_date, payload.reservation_time)

    active_reservations_count = db.query(Reservation).filter(
        Reservation.user_id == user["user_id"],
        Reservation.status.in_(list(ACTIVE_STATUSES)),
        Reservation.reservation_date >= date.today()
    ).count()

    if active_reservations_count >= MAX_UPCOMING_RESERVATIONS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail="Too many upcoming reservations. Please manage existing bookings first."
        )

    duplicate_reservation = db.query(Reservation).filter(
        Reservation.user_id == user["user_id"],
        Reservation.reservation_date == payload.reservation_date,
        Reservation.reservation_time == payload.reservation_time,
        Reservation.guest_count == payload.guest_count,
        Reservation.status.in_(list(ACTIVE_STATUSES))
    ).first()

    if duplicate_reservation:
        raise HTTPException(
            status_code=409,
            detail="You already have a reservation for this time"
        )

    overlapping_reservations = db.query(Reservation).filter(
        Reservation.reservation_date == payload.reservation_date,
        Reservation.status.in_(list(ACTIVE_STATUSES))
    ).all()

    booked_seats = sum(
        reservation.guest_count
        for reservation in overlapping_reservations
        if overlap(
            reservation_start_dt,
            reservation_end_dt,
            reservation_start(reservation.reservation_date, reservation.reservation_time),
            reservation_end(reservation.reservation_date, reservation.reservation_time)
        )
    )

    if booked_seats + payload.guest_count > RESTAURANT_CAPACITY:
        raise HTTPException(
            status_code=409,
            detail="Selected slot cannot accommodate that many guests"
        )

    new_reservation = Reservation(
        reservation_id=generate_reservation_id(),
        user_id=user["user_id"],
        customer_name=payload.customer_name,
        phone_number=normalized_phone,
        guest_count=payload.guest_count,
        reservation_date=payload.reservation_date,
        reservation_time=payload.reservation_time,
        reservation_end_time=reservation_end_dt.time(),
        status="pending",
        special_request=payload.special_request,
        assigned_table=None,
        payment_status="pending_payment",
        payment_method=None,
        transaction_id=None,
        paid_amount=0,
        paid_at=None,
        reminder_status="pending"
    )

    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)

    return {
        "message": "Reservation created successfully",
        "reservation": serialize_reservation(new_reservation)
    }


@router.post(
    "/reservations/{reservation_id}/payment",
    dependencies=[Depends(JWTBearer())]
)
def pay_reservation_deposit(
    reservation_id: str,
    payload: ReservationPaymentRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_customer_access(request)

    reservation = db.query(Reservation).filter(
        Reservation.reservation_id == reservation_id,
        Reservation.user_id == user["user_id"]
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.payment_status == "paid":
        return {
            "message": "Reservation deposit already paid",
            "reservation": serialize_reservation(reservation)
        }

    if payload.deposit_amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than 0")

    transaction_id = f"TXN-{datetime.utcnow():%Y%m%d%H%M%S}-{uuid4().hex[:6].upper()}"

    reservation.payment_status = "paid"
    reservation.payment_method = payload.payment_method
    reservation.transaction_id = transaction_id
    reservation.paid_amount = payload.deposit_amount
    reservation.paid_at = datetime.utcnow()
    reservation.status = "confirmed"
    reservation.reminder_status = "ready"

    db.commit()
    db.refresh(reservation)

    return {
        "message": "Reservation deposit paid successfully",
        "payment": ReservationPaymentResponse.model_validate({
            "payment_status": reservation.payment_status,
            "payment_method": reservation.payment_method,
            "transaction_id": reservation.transaction_id,
            "paid_amount": reservation.paid_amount,
            "paid_at": reservation.paid_at
        }).model_dump(mode="json"),
        "reservation": serialize_reservation(reservation)
    }


@router.get(
    "/my-reservations",
    dependencies=[Depends(JWTBearer())]
)
def get_my_reservations(
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_customer_access(request)

    reservations = db.query(Reservation).filter(
        Reservation.user_id == user["user_id"]
    ).order_by(
        Reservation.reservation_date.desc(),
        Reservation.reservation_time.desc()
    ).all()

    return ReservationListResponse.model_validate({
        "reservations": [serialize_reservation(reservation) for reservation in reservations]
    }).model_dump(mode="json")


@router.get(
    "/my-reservations/{reservation_id}",
    dependencies=[Depends(JWTBearer())]
)
def get_single_reservation(
    reservation_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_customer_access(request)

    reservation = db.query(Reservation).filter(
        Reservation.reservation_id == reservation_id,
        Reservation.user_id == user["user_id"]
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    return {
        "reservation": serialize_reservation(reservation)
    }


@router.get(
    "/reservations/admin",
    dependencies=[Depends(JWTBearer()), Depends(staff_or_admin)]
)
def get_admin_reservations(
    request: Request,
    status: str | None = None,
    search: str | None = None,
    date_filter: date | None = Query(default=None, alias="date"),
    scope: Literal["all", "today", "upcoming"] = "all",
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Reservation)

    if scope == "today":
        query = query.filter(Reservation.reservation_date == date.today())
    elif scope == "upcoming":
        query = query.filter(Reservation.reservation_date >= date.today())

    if date_filter:
        query = query.filter(Reservation.reservation_date == date_filter)

    if status and status != "all":
        query = query.filter(Reservation.status == status)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Reservation.reservation_id.ilike(search_term)) |
            (Reservation.customer_name.ilike(search_term)) |
            (Reservation.phone_number.ilike(search_term)) |
            (Reservation.assigned_table.ilike(search_term))
        )

    reservations = query.order_by(
        Reservation.reservation_date.asc(),
        Reservation.reservation_time.asc()
    ).offset((page - 1) * limit).limit(limit).all()

    return {
        "page": page,
        "limit": limit,
        "reservations": [serialize_reservation(reservation) for reservation in reservations]
    }


@router.get(
    "/reservations/admin/analytics",
    dependencies=[Depends(JWTBearer()), Depends(staff_or_admin)]
)
def get_reservation_analytics(
    target_date: date | None = Query(default=None),
    db: Session = Depends(get_db)
):
    target_date = target_date or date.today()

    reservations = db.query(Reservation).filter(
        Reservation.reservation_date == target_date,
        Reservation.status.in_(list(OCCUPANCY_STATUSES))
    ).all()

    slots = build_day_slots(reservations, target_date, 1, OCCUPANCY_STATUSES)

    occupied_seats = sum(reservation.guest_count for reservation in reservations)
    remaining_seats = max(0, RESTAURANT_CAPACITY - occupied_seats)
    confirmed_today = sum(1 for reservation in reservations if reservation.status == "confirmed")
    pending_today = sum(1 for reservation in reservations if reservation.status == "pending")

    busiest = sorted(
        slots,
        key=lambda item: (item["booked_seats"], item["reservation_count"] if "reservation_count" in item else 0),
        reverse=True
    )

    peak_hours = [slot["slot_label"] for slot in busiest[:3] if slot["booked_seats"] > 0]

    analytics_slots = [
        ReservationAnalyticsSlot.model_validate(
            {
                "slot_label": slot["slot_label"],
                "booked_seats": slot["booked_seats"],
                "reservation_count": len([
                    reservation for reservation in reservations
                    if overlap_bucket_calculation(
                        datetime.combine(target_date, slot["slot_time"]),
                        datetime.combine(target_date, slot["slot_time"]) + timedelta(minutes=SLOT_INTERVAL_MINUTES),
                        reservation_start(reservation.reservation_date, reservation.reservation_time),
                        reservation_end(reservation.reservation_date, reservation.reservation_time)
                    )
                ]),
                "status": slot["status"],
                "occupancy_percent": round((slot["booked_seats"] / RESTAURANT_CAPACITY) * 100, 2) if RESTAURANT_CAPACITY else 0,
                "occupancy_window": ReservationOccupancyWindow.model_validate({
                    "bucket_start": slot["slot_time"],
                    "bucket_end": (datetime.combine(target_date, slot["slot_time"]) + timedelta(minutes=SLOT_INTERVAL_MINUTES)).time(),
                    "label": f"{slot['slot_label']} - {slot_label(datetime.combine(target_date, slot['slot_time']) + timedelta(minutes=SLOT_INTERVAL_MINUTES))}"
                })
            }
        ).model_dump(mode="json")
        for slot in slots
    ]

    return ReservationAnalyticsResponse.model_validate({
        "today_date": target_date,
        "capacity": RESTAURANT_CAPACITY,
        "occupied_seats": occupied_seats,
        "remaining_seats": remaining_seats,
        "total_today_reservations": len(reservations),
        "confirmed_today": confirmed_today,
        "pending_today": pending_today,
        "peak_hours": peak_hours,
        "busiest_slots": analytics_slots[:5],
        "timeline": analytics_slots
    }).model_dump(mode="json")


@router.patch(
    "/reservations/admin/{reservation_id}/status",
    dependencies=[Depends(JWTBearer()), Depends(staff_or_admin)]
)
def update_reservation_status(
    reservation_id: str,
    payload: ReservationStatusUpdate,
    db: Session = Depends(get_db)
):
    reservation = db.query(Reservation).filter(
        Reservation.reservation_id == reservation_id
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid reservation status")

    if payload.status == "completed" and (
        not reservation.assigned_table or not reservation.assigned_table.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="Assign table number and seating type before completing the reservation."
        )

    reservation.status = payload.status

    if payload.status == "confirmed" and reservation.reminder_status == "pending":
        reservation.reminder_status = "ready"
    elif payload.status in {"cancelled", "rejected"}:
        reservation.reminder_status = "skipped"
    elif payload.status == "completed":
        reservation.reminder_status = "sent"

    db.commit()
    db.refresh(reservation)

    return {
        "message": "Reservation status updated",
        "reservation": serialize_reservation(reservation)
    }


@router.patch(
    "/reservations/admin/{reservation_id}/table",
    dependencies=[Depends(JWTBearer()), Depends(staff_or_admin)]
)
def assign_reservation_table(
    reservation_id: str,
    payload: ReservationTableAssign,
    db: Session = Depends(get_db)
):
    reservation = db.query(Reservation).filter(
        Reservation.reservation_id == reservation_id
    ).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.assigned_table = f"Table {payload.table_number} ({payload.seating_type})"
    db.commit()
    db.refresh(reservation)

    return {
        "message": "Table assigned successfully",
        "reservation": serialize_reservation(reservation)
    }