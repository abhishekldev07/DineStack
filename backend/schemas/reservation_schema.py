from datetime import date, datetime, time
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from utils.reservation_time_utils import (
    MAX_GUESTS_PER_RESERVATION,
    RESTAURANT_CLOSE_TIME,
    RESTAURANT_OPEN_TIME,
    calculate_reservation_end_time,
)


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


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


class ReservationCreate(BaseModel):

    customer_name: str = Field(min_length=2, max_length=80)

    phone_number: str

    guest_count: int = Field(ge=1, le=MAX_GUESTS_PER_RESERVATION)

    reservation_date: date

    reservation_time: time

    special_request: Optional[str] = Field(default=None, max_length=500)

    @field_validator("customer_name")
    @classmethod
    def validate_customer_name(cls, value):
        normalized_value = normalize_text(value)

        if not normalized_value:
            raise ValueError("Customer name is required")

        if len(normalized_value) < 2:
            raise ValueError("Customer name must be at least 2 characters")

        return normalized_value

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value):
        return normalize_phone_number(value)

    @field_validator("special_request")
    @classmethod
    def validate_special_request(cls, value):
        return normalize_text(value)

    @model_validator(mode="after")
    def validate_reservation_window(self):
        if self.reservation_date < date.today():
            raise ValueError("Reservation date cannot be in the past")

        if self.reservation_time.minute not in {0, 30} or self.reservation_time.second != 0:
            raise ValueError("Reservation time must be on a 30-minute slot")

        reservation_start = datetime.combine(self.reservation_date, self.reservation_time)
        reservation_end = calculate_reservation_end_time(self.reservation_date, self.reservation_time)
        reservation_end_dt = datetime.combine(self.reservation_date, reservation_end)

        open_dt = datetime.combine(self.reservation_date, RESTAURANT_OPEN_TIME)
        close_dt = datetime.combine(self.reservation_date, RESTAURANT_CLOSE_TIME)

        if reservation_start < open_dt:
            raise ValueError("Reservations can only be booked during restaurant hours")

        if reservation_end_dt > close_dt:
            raise ValueError("Reservations can only be booked during restaurant hours")

        if self.reservation_date == date.today() and reservation_start < datetime.now():
            raise ValueError("Reservation time cannot be in the past")

        return self


class ReservationStatusUpdate(BaseModel):

    status: Literal[
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected"
    ]


class ReservationTableAssign(BaseModel):

    table_number: int = Field(ge=1, le=200)

    seating_type: Literal["indoor", "outdoor", "vip"]


class ReservationPaymentRequest(BaseModel):

    payment_method: Literal["card", "khalti", "esewa"]

    deposit_amount: float = Field(gt=0)


class ReservationPaymentResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    payment_status: Literal["pending_payment", "paid", "failed", "refunded"]

    payment_method: Optional[str] = None

    transaction_id: Optional[str] = None

    paid_amount: float

    paid_at: Optional[datetime] = None


class ReservationReminderReady(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    sms_ready: bool

    email_ready: bool

    next_reminder_at: Optional[datetime] = None


class ReservationResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: int
    reservation_id: str
    user_id: int
    customer_name: str
    phone_number: str
    guest_count: int
    reservation_date: date
    reservation_time: time
    reservation_end_time: time
    status: str
    special_request: Optional[str] = None
    assigned_table: Optional[str] = None
    payment_status: Literal["pending_payment", "paid", "failed", "refunded"]
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    paid_amount: float
    paid_at: Optional[datetime] = None
    reminder_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    reminder_ready: ReservationReminderReady


class ReservationListResponse(BaseModel):

    reservations: List[ReservationResponse]


class ReservationAvailabilitySlot(BaseModel):

    slot_time: time
    slot_label: str
    status: Literal["available", "limited", "fully_booked"]
    booked_seats: int
    remaining_seats: int
    can_book: bool


class ReservationOccupancyWindow(BaseModel):

    bucket_start: time

    bucket_end: time

    label: str


class ReservationAvailabilityResponse(BaseModel):

    reservation_date: date
    guest_count: int
    capacity: int
    slots: List[ReservationAvailabilitySlot]


class ReservationAnalyticsSlot(BaseModel):

    slot_label: str
    booked_seats: int
    reservation_count: int
    status: Literal["available", "limited", "fully_booked"]
    occupancy_percent: float
    occupancy_window: ReservationOccupancyWindow


class ReservationAnalyticsResponse(BaseModel):

    today_date: date
    capacity: int
    occupied_seats: int
    remaining_seats: int
    total_today_reservations: int
    confirmed_today: int
    pending_today: int
    peak_hours: List[str]
    busiest_slots: List[ReservationAnalyticsSlot]
    timeline: List[ReservationAnalyticsSlot]