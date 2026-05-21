const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  confirmed: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  rejected: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  default: "bg-white/5 text-slate-300 border-white/10"
};

const RESERVATION_DURATION_MINUTES = 90;

export function calculateReservationEndTime(reservationTime, durationMinutes = RESERVATION_DURATION_MINUTES) {
  if (!reservationTime) return null;

  const valueString = String(reservationTime);
  if (!valueString.includes(":")) {
    return null;
  }

  const [hoursRaw, minutesRaw] = valueString.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw?.slice(0, 2) || 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const normalizedHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const normalizedMinutes = totalMinutes % 60;

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

export function getReservationStatusClass(status) {
  return STATUS_STYLES[String(status || "").toLowerCase()] || STATUS_STYLES.default;
}

export function formatReservationDate(value) {
  if (!value) return "—";

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return String(value);
  }

  return dateValue.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function formatReservationTime(value) {
  if (!value) return "—";

  const valueString = String(value);
  if (!valueString.includes(":")) {
    return valueString;
  }

  const [hoursRaw, minutesRaw] = valueString.split(":");
  const hours = Number(hoursRaw);
  const minutes = minutesRaw?.slice(0, 2) || "00";

  if (Number.isNaN(hours)) {
    return valueString;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = ((hours + 11) % 12) + 1;
  return `${normalizedHours}:${minutes} ${period}`;
}

export function formatReservationInterval(reservation) {
  return `${formatReservationDate(reservation?.reservation_date)} · ${formatReservationTime(reservation?.reservation_time)} - ${formatReservationTime(reservation?.reservation_end_time)}`;
}

export function formatReservationRange(reservation) {
  return formatReservationInterval(reservation);
}

export function formatOccupancyWindow(windowValue) {
  if (!windowValue) return "—";

  const start = formatReservationTime(windowValue.bucket_start);
  const end = formatReservationTime(windowValue.bucket_end);

  if (start === "—" && end === "—") {
    return String(windowValue.label || "—");
  }

  return `${start} - ${end}`;
}

export function overlapBucketCalculation(bucketStart, bucketEnd, reservationStart, reservationEnd) {
  return bucketStart < reservationEnd && reservationStart < bucketEnd;
}
