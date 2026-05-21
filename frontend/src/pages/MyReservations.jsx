import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath } from "../utils/roleUtils";
import { getMyReservations } from "../services/reservationService";
import {
  formatReservationDate,
  formatReservationRange,
  formatReservationTime,
  getReservationStatusClass
} from "../utils/reservationHelpers";

export default function MyReservations() {
  const navigate = useNavigate();
  const { role, isCustomer } = useRole() || {};
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const filteredReservations = useMemo(() => {
    if (activeStatus === "all") {
      return reservations;
    }

    return reservations.filter((reservation) => reservation.status === activeStatus);
  }, [activeStatus, reservations]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getMyReservations();
      setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (error) {
      console.error(error);
      setErrorMessage(error?.response?.data?.detail || error?.response?.data?.error || "Unable to load reservations.");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  if (!isCustomer) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 text-slate-100">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-300/70">Reservations</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Reservation History</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Track your booking requests, confirmation status, and assigned table information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/reservations")}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 lg:w-auto"
          >
            Book a Table
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            "all",
            "pending",
            "confirmed",
            "completed",
            "cancelled",
            "rejected"
          ].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeStatus === status ? "bg-white text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-[2rem] bg-white/5" />
            ))}
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-8 text-center text-slate-400">
            No reservations found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReservations.map((reservation) => (
              <article
                key={reservation.reservation_id}
                onClick={() => setSelectedReservation(reservation)}
                className="cursor-pointer rounded-[2rem] border border-white/5 bg-slate-900/40 p-5 shadow-2xl transition hover:-translate-y-1 hover:bg-slate-900/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Reservation</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{reservation.reservation_id}</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getReservationStatusClass(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Date & Time</p>
                    <p className="mt-2 font-semibold text-white">{formatReservationRange(reservation)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Guests</p>
                    <p className="mt-2 font-semibold text-white">{reservation.guest_count}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Table</p>
                    <p className="mt-2 font-semibold text-white">{reservation.assigned_table || "Pending assignment"}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                  <span>Reminder: {reservation.reminder_status}</span>
                  <span>{formatReservationDate(reservation.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {selectedReservation && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-10">
            <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl sm:max-h-[calc(100vh-5rem)] sm:p-8">
              <div className="flex items-start justify-between gap-4 pr-14">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300/70">Reservation Details</p>
                  <h3 className="mt-2 text-3xl font-black text-white">{selectedReservation.reservation_id}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReservation(null)}
                  className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:right-8 sm:top-8"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Status", selectedReservation.status],
                  ["Name", selectedReservation.customer_name],
                  ["Phone", selectedReservation.phone_number],
                  ["Guests", selectedReservation.guest_count],
                  ["Schedule", formatReservationRange(selectedReservation)],
                  ["Table", selectedReservation.assigned_table || "Pending assignment"],
                  ["Reminder", selectedReservation.reminder_status],
                  ["Special Request", selectedReservation.special_request || "None"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white whitespace-pre-wrap">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
