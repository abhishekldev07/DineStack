from __future__ import annotations

from datetime import date, datetime, time, timedelta


RESTAURANT_OPEN_TIME = time(11, 0)
RESTAURANT_CLOSE_TIME = time(22, 0)
RESERVATION_DURATION_MINUTES = 90
MAX_GUESTS_PER_RESERVATION = 12


def calculate_reservation_end_time(reservation_date: date, reservation_time: time) -> time:
    return (datetime.combine(reservation_date, reservation_time) + timedelta(minutes=RESERVATION_DURATION_MINUTES)).time()


def reservation_interval(reservation_date: date, reservation_time: time) -> tuple[datetime, datetime]:
    start_dt = datetime.combine(reservation_date, reservation_time)
    end_dt = start_dt + timedelta(minutes=RESERVATION_DURATION_MINUTES)
    return start_dt, end_dt


def overlap_bucket_calculation(
    bucket_start: datetime,
    bucket_end: datetime,
    reservation_start: datetime,
    reservation_end: datetime,
) -> bool:
    return bucket_start < reservation_end and reservation_start < bucket_end