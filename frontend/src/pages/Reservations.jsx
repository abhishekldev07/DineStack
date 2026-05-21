import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath } from "../utils/roleUtils";
import {
  createReservation,
  getReservationAvailability
  , payReservationDeposit
} from "../services/reservationService";
import {
  formatReservationDate,
  formatReservationRange,
  formatReservationTime,
  getReservationStatusClass
} from "../utils/reservationHelpers";

const todayIso = new Date().toISOString().split("T")[0];
const RESERVATION_DEPOSIT = 200;

function extractErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((entry) => entry?.msg || entry?.message || "Validation error").join(" ");
  }

  return error?.response?.data?.error || "Unable to complete reservation";
}

export default function Reservations() {
  const { role, isCustomer } = useRole() || {};
  const profileUser = JSON.parse(localStorage.getItem("user") || "null");
  const [customerName, setCustomerName] = useState(profileUser?.username || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [reservationDate, setReservationDate] = useState(todayIso);
  const [reservationTime, setReservationTime] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [availability, setAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [successReservation, setSuccessReservation] = useState(null);
  const [paymentReservation, setPaymentReservation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [customerTouched, setCustomerTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [guestTouched, setGuestTouched] = useState(false);
  const [specialRequestTouched, setSpecialRequestTouched] = useState(false);
  const specialRequestRef = useRef(null);

  const phoneDigits = phoneNumber.replace(/\D/g, "").slice(0, 10);
  const isPhoneValid = /^9[78]\d{8}$/.test(phoneDigits);
  const trimmedName = customerName.trim();
  const trimmedRequest = specialRequest.trim();
  const selectedSlot = useMemo(
    () => availability.find((slot) => slot.slot_time === reservationTime) || null,
    [availability, reservationTime]
  );

  const customerError = (customerTouched || submitAttempted) && trimmedName.length < 2
    ? "Customer name must be at least 2 characters."
    : "";

  const phoneError = (phoneTouched || submitAttempted) && !isPhoneValid
    ? phoneDigits.length === 0
      ? "Phone number is required."
      : phoneDigits.length !== 10
        ? "Phone number must be exactly 10 digits."
        : "Phone number must start with 98 or 97."
    : "";

  const guestError = (guestTouched || submitAttempted) && (guestCount < 1 || guestCount > 12)
    ? "Guest count must be between 1 and 12."
    : "";

  const requestError = (specialRequestTouched || submitAttempted) && trimmedRequest.length > 500
    ? "Special request must be 500 characters or fewer."
    : "";

  const canSubmit =
    trimmedName.length >= 2 &&
    isPhoneValid &&
    guestCount >= 1 &&
    guestCount <= 12 &&
    reservationDate >= todayIso &&
    Boolean(reservationTime) &&
    Boolean(selectedSlot?.can_book) &&
    !requestError;

  const resizeTextarea = (element) => {
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea(specialRequestRef.current);
  }, [specialRequest]);

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        setLoadingSlots(true);
        setSlotError("");
        setReservationTime("");

        if (!reservationDate || guestCount < 1) {
          setAvailability([]);
          return;
        }

        const data = await getReservationAvailability(reservationDate, guestCount);
        setAvailability(Array.isArray(data?.slots) ? data.slots : []);
      } catch (error) {
        console.error(error);
        setAvailability([]);
        setSlotError(extractErrorMessage(error));
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadAvailability();
  }, [guestCount, reservationDate]);

  if (!isCustomer) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  const handleSubmit = async () => {
    try {
      setSubmitAttempted(true);
      setSubmitError("");

      if (!canSubmit) {
        setSubmitError("Please fix the highlighted fields before booking.");
        return;
      }

      const response = await createReservation({
        customer_name: trimmedName,
        phone_number: phoneDigits,
        guest_count: guestCount,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        special_request: trimmedRequest || null
      });

      setPaymentReservation(response?.reservation || null);
      setPaymentMethod("card");
      setPaymentError("");
      setSubmitError("");
      setSubmitAttempted(false);
    } catch (error) {
      console.error(error);
      setSubmitError(extractErrorMessage(error));
    }
  };

  const handlePayDeposit = async () => {
    if (!paymentReservation?.reservation_id) {
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");

      const response = await payReservationDeposit(paymentReservation.reservation_id, {
        payment_method: paymentMethod,
        deposit_amount: RESERVATION_DEPOSIT
      });

      setSuccessReservation(response?.reservation || null);
      setPaymentReservation(null);
      setReservationTime("");
      setSpecialRequest("");
      setPhoneNumber("");
      setCustomerName(profileUser?.username || "");
      setGuestCount(2);
      setSubmitAttempted(false);
      setCustomerTouched(false);
      setPhoneTouched(false);
      setGuestTouched(false);
      setSpecialRequestTouched(false);
    } catch (error) {
      console.error(error);
      setPaymentError(extractErrorMessage(error));
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-2 py-6 sm:px-6 sm:py-10 text-slate-100">
        
        {/* Header Block */}
        <div className="mb-8 rounded-2xl sm:rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-850 p-6 sm:p-10 border border-white/5 overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.02),_transparent_30%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.32em] text-white/50 mb-2">Reservations</p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Book a Table</h1>
              <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Choose a date, pick a live slot, and secure your table with real-time capacity checks.
              </p>
            </div>

            <Link
              to="/my-reservations"
              className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 sm:px-6 sm:py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 w-full sm:w-auto justify-center text-center"
            >
              View Reservation History
            </Link>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-400">
            {submitError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          
          {/* Main Booking Panel - Adjusted padding on mobile to expand width of contents */}
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-white/5 bg-slate-900/40 p-4 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Name</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => {
                    setCustomerTouched(true);
                    setCustomerName(event.target.value);
                  }}
                  onBlur={() => setCustomerTouched(true)}
                  placeholder="Your name"
                  className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${customerError ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30" : "border-white/10 focus:border-amber-400/50 focus:ring-amber-400/20"}`}
                />
                {customerError && <p className="text-xs font-semibold text-rose-400">{customerError}</p>}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={phoneDigits}
                  onChange={(event) => {
                    setPhoneTouched(true);
                    setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="98XXXXXXXX"
                  className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${phoneError ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30" : "border-white/10 focus:border-amber-400/50 focus:ring-amber-400/20"}`}
                />
                {phoneError && <p className="text-xs font-semibold text-rose-400">{phoneError}</p>}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Guest Count</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={guestCount}
                  onChange={(event) => {
                    setGuestTouched(true);
                    setGuestCount(Number(event.target.value || 1));
                  }}
                  onBlur={() => setGuestTouched(true)}
                  className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 ${guestError ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30" : "border-white/10 focus:border-amber-400/50 focus:ring-amber-400/20"}`}
                />
                {guestError && <p className="text-xs font-semibold text-rose-400">{guestError}</p>}
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reservation Date</span>
                <input
                  type="date"
                  min={todayIso}
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Special Request</span>
                <textarea
                  ref={specialRequestRef}
                  value={specialRequest}
                  onChange={(event) => {
                    setSpecialRequestTouched(true);
                    setSpecialRequest(event.target.value);
                    resizeTextarea(event.target);
                  }}
                  onBlur={() => setSpecialRequestTouched(true)}
                  onInput={(event) => resizeTextarea(event.target)}
                  rows={3}
                  placeholder="Allergies, anniversary setup, seating preference, or notes"
                  className={`w-full overflow-hidden rounded-2xl border bg-slate-950/60 px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${requestError ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30" : "border-white/10 focus:border-amber-400/50 focus:ring-amber-400/20"}`}
                />
                {requestError && <p className="text-xs font-semibold text-rose-400">{requestError}</p>}
              </label>
            </div>

            {/* Availability Slots Grid Panel - Polished for Mobile Width */}
            <div className="mt-8 rounded-2xl border border-white/5 bg-slate-950/50 p-4 sm:p-5">
              <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Live Availability</p>
                  <h2 className="mt-1 text-xl font-black text-white tracking-tight">Select a Table Slot</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 shrink-0">
                  Capacity 40 seats
                </span>
              </div>

              {slotError && (
                <p className="mb-4 rounded-xl border border-rose-500/20 bg-rose-50/5 px-4 py-3 text-xs font-semibold text-rose-400">
                  {slotError}
                </p>
              )}

              {/* Flex wrapped indicators with custom min-width to avoid narrow line wrapping */}
              <div className="mb-6 flex flex-wrap gap-2">
                {[
                  { label: "Available", tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                  { label: "Limited", tone: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                  { label: "Fully Booked", tone: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
                ].map((item) => (
                  <div key={item.label} className={`flex-1 min-w-[95px] rounded-xl border px-2 py-2 text-[11px] font-bold text-center ${item.tone}`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Time Slots Cards Grid */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {loadingSlots ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5 border border-white/5" />
                  ))
                ) : (
                  availability.map((slot) => {
                    const isSelected = reservationTime === slot.slot_time;
                    const statusClass = slot.status === "fully_booked" ? "cancelled" : slot.status === "limited" ? "pending" : "confirmed";

                    return (
                      <button
                        key={slot.slot_label}
                        type="button"
                        disabled={!slot.can_book}
                        onClick={() => setReservationTime(slot.slot_time)}
                        className={`rounded-2xl border p-4 text-left transition duration-300 ${
                          isSelected 
                            ? "border-amber-400/50 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.12)]" 
                            : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {/* Horizontal Header Row: Title & Styled Status Pill aligned on the same axis */}
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-base font-black text-white">{slot.slot_label}</h4>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${getReservationStatusClass(statusClass)}`}>
                            {slot.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {/* Summary details below heading */}
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <span>Booked: <strong className="text-slate-300 font-mono">{slot.booked_seats}</strong></span>
                          <span>Remaining: <strong className="text-slate-300 font-mono">{slot.remaining_seats}</strong></span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-5 rounded-xl bg-slate-950/40 border border-white/5 p-4 text-xs text-slate-400 leading-relaxed">
                {selectedSlot ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p>
                      Selected <strong className="text-white font-mono">{selectedSlot.slot_label}</strong> for {guestCount} guests.
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                      {selectedSlot.status === "available" ? "Instant confirmation" : "Limited capacity"}
                    </span>
                  </div>
                ) : (
                  <p className="text-center italic">Please choose one of the live reservation slots above.</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-6 w-full rounded-full bg-white px-6 py-4 text-sm font-bold text-slate-950 transition duration-300 hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              Confirm Reservation
            </button>
          </section>

          {/* Right Sidebar Status info */}
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Reservation Summary</p>
              <h2 className="mt-2 text-2xl font-black text-white">Live Booking Snapshot</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</span>
                  <span className="font-semibold text-white">{formatReservationDate(reservationDate)}</span>
                </div>
                
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Time</span>
                  <span className="font-semibold text-white">
                    {reservationTime ? formatReservationTime(reservationTime) : "Select a slot"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Guests</span>
                  <span className="font-semibold text-white font-mono">{guestCount}</span>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
                  <span className="font-semibold text-slate-400 text-xs">Awaiting confirmation</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-500/10 bg-amber-500/5 p-6 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-200/80">Rules</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-amber-100/70 list-disc list-inside">
                <li>No past dates or outside-hours reservations.</li>
                <li>Slots refresh live based on party size.</li>
                <li>Reservations are audited to prevent spam.</li>
              </ul>
            </div>
          </aside>
        </div>

        {paymentReservation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Deposit Payment</p>
                  <h3 className="mt-2 text-3xl font-black text-white">Confirm Reservation Payment</h3>
                  <p className="mt-1 text-sm text-slate-400">Pay the reservation deposit to lock in your table.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!paymentLoading) {
                      setPaymentReservation(null);
                      setPaymentError("");
                    }
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={paymentLoading}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
                {[
                  ["Reservation ID", paymentReservation.reservation_id],
                  ["Guests", paymentReservation.guest_count],
                  ["Date", formatReservationDate(paymentReservation.reservation_date)],
                  ["Time", formatReservationTime(paymentReservation.reservation_time)],
                  ["Deposit", `Rs. ${RESERVATION_DEPOSIT}`],
                  ["Status", paymentReservation.payment_status]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white capitalize">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Payment Method</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    ["card", "Card"],
                    ["khalti", "Khalti"],
                    ["esewa", "eSewa"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${paymentMethod === value ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                      disabled={paymentLoading}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">This is a simulated portfolio payment. No real gateway is used.</p>
              </div>

              {paymentError && (
                <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                  {paymentError}
                </p>
              )}

              <button
                type="button"
                onClick={handlePayDeposit}
                disabled={paymentLoading}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {paymentLoading ? (
                  <span className="inline-flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
                    Processing Deposit...
                  </span>
                ) : (
                  `Pay Rs. ${RESERVATION_DEPOSIT} Deposit`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal success card display */}
        {successReservation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8 animate-in fade-in zoom-in-95">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-400 animate-pulse">Reservation Confirmed</p>
                  <h3 className="mt-2 text-3xl font-black text-white">{successReservation.customer_name}</h3>
                  <p className="mt-1 text-sm text-slate-400">Your table request has been secured successfully.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessReservation(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
                {[
                  ["Reservation ID", successReservation.reservation_id],
                  ["Status", successReservation.status],
                  ["Date", formatReservationDate(successReservation.reservation_date)],
                  ["Time", formatReservationTime(successReservation.reservation_time)],
                  ["Guests", successReservation.guest_count],
                  ["Payment", successReservation.payment_status],
                  ["Method", successReservation.payment_method || "—"],
                  ["Transaction", successReservation.transaction_id || "—"],
                  ["Reminder", successReservation.reminder_status]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white capitalize">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row pt-3">
                <Link
                  to="/my-reservations"
                  className="flex-1 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                >
                  View Reservations
                </Link>
                <button
                  type="button"
                  onClick={() => setSuccessReservation(null)}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Book Another Table
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}