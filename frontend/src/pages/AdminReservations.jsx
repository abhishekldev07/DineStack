import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath, isAdminRole, isStaffRole } from "../utils/roleUtils";

import {
  assignReservationTable,
  getAdminReservations,
  getReservationAnalytics,
  updateReservationStatus
} from "../services/reservationService";

import {
  formatReservationDate,
  formatReservationInterval,
  getReservationStatusClass
} from "../utils/reservationHelpers";

export default function AdminReservations() {
  const { role } = useRole() || {};
  const isAllowed = isAdminRole(role) || isStaffRole(role);
  
  const [reservations, setReservations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [scope, setScope] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [analyticsDate, setAnalyticsDate] = useState(new Date().toISOString().split("T")[0]);
  const [tableForm, setTableForm] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [listData, analyticsData] = await Promise.all([
        getAdminReservations({
          scope,
          status: statusFilter,
          search: searchInput.trim() || undefined,
          limit: 100
        }),
        getReservationAnalytics(analyticsDate)
      ]);

      setReservations(Array.isArray(listData?.reservations) ? listData.reservations : []);
      setAnalytics(analyticsData || null);
    } catch (error) {
      console.error(error);
      setReservations([]);
      setAnalytics(null);
      setErrorMessage(
        error?.response?.data?.detail || 
        error?.response?.data?.error || 
        "Unable to load reservation management data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scope, statusFilter, analyticsDate, searchInput]);

  if (!isAllowed) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  const topStats = useMemo(() => {
    const timeline = Array.isArray(analytics?.timeline) ? analytics.timeline : [];

    return [
      { 
        title: "Occupied Seats", 
        value: analytics?.occupied_seats ?? 0, 
        subtitle: "Current active reservations", 
        tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
      },
      { 
        title: "Remaining Seats", 
        value: analytics?.remaining_seats ?? 0, 
        subtitle: "Restaurant headroom", 
        tone: "bg-blue-500/10 text-blue-400 border-blue-500/20" 
      },
      { 
        title: "Today Reservations", 
        value: analytics?.total_today_reservations ?? 0, 
        subtitle: "Bookings for selected day", 
        tone: "bg-amber-500/10 text-amber-400 border-amber-500/20" 
      },
      { 
        title: "Peak Slots", 
        value: analytics?.peak_hours?.length ?? 0, 
        subtitle: timeline.length ? "Occupancy windows identified" : "No peak data yet", 
        tone: "bg-purple-500/10 text-purple-400 border-purple-500/20" 
      }
    ];
  }, [analytics]);

  const handleReservationStatus = async (reservationId, status) => {
    try {
      await updateReservationStatus(reservationId, status);
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // Smart table assign: table mapping automatically auto-confirms pending requests
  const handleAssignTable = async (reservationId, currentStatus) => {
    const form = tableForm[reservationId] || {};

    if (!form.tableNumber || !form.seatingType) {
      alert("Please enter both Table Number and select Zone");
      return;
    }

    try {
      // 1. Assign table
      await assignReservationTable(reservationId, Number(form.tableNumber), form.seatingType);
      
      // 2. Business logic: If status was 'pending', auto-confirm upon assigning table
      if (currentStatus === "pending") {
        await updateReservationStatus(reservationId, "confirmed");
      }
      
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 text-slate-100 font-sans">
        
        {/* Header Hero Section */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-850 p-6 sm:p-10 border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_35%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-white/50 mb-2">Reservation Management</p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Staff & Admin Panel</h1>
              <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-300 leading-relaxed">
                Monitor live occupancy, manage approval flow, assign tables, and review occupancy windows in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="inline-flex shrink-0 rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] w-full lg:w-auto justify-center"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-400">
            {errorMessage}
          </div>
        )}

        {/* Top Analytics Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {topStats.map((item) => (
            <div key={item.title} className={`rounded-3xl border p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${item.tone}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{item.title}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight font-mono">{item.value}</h2>
              <p className="mt-2 text-xs opacity-65 leading-relaxed">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Main Content Layout Block */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          
          <section className="rounded-3xl border border-white/5 bg-slate-900/40 p-4 sm:p-6 shadow-2xl backdrop-blur-md">
            
            {/* Filter controls row */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filters</p>
                <h2 className="mt-1 text-xl sm:text-2xl font-black text-white tracking-tight">Today's & Upcoming</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["today", "Today"],
                  ["upcoming", "Upcoming"],
                  ["all", "All"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScope(value)}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                      scope === value 
                        ? "bg-white text-slate-950 shadow-lg" 
                        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status tags selection wrap */}
            <div className="mt-6 flex flex-wrap gap-2">
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
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                    statusFilter === status 
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-200" 
                      : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Inputs Block */}
            <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-[1.4fr_0.6fr]">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by reservation id, name, phone, or table"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-slate-700 focus:outline-none"
              />
              <input
                type="date"
                value={analyticsDate}
                onChange={(event) => setAnalyticsDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-slate-700 focus:outline-none font-mono"
              />
            </div>

            {/* Interactive Cards mapping */}
            {loading ? (
              <div className="mt-6 space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-44 animate-pulse rounded-3xl bg-slate-900/40 border border-white/5" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/20 p-12 text-center text-slate-500">
                No active reservations match the current filters.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {reservations.map((reservation) => {
                  const isPending = reservation.status === "pending";
                  const isConfirmed = reservation.status === "confirmed";
                  const isTerminal = ["completed", "cancelled", "rejected"].includes(reservation.status);
                  const hasAssignedTable = Boolean(String(reservation.assigned_table || "").trim());
                  const canCompleteReservation = isConfirmed && hasAssignedTable;
                  const completionWarning = isConfirmed && !hasAssignedTable
                    ? "Assign table number and seating type before completing the reservation."
                    : "";

                  return (
                    <article 
                      key={reservation.reservation_id} 
                      className="rounded-3xl border border-white/5 bg-slate-950/30 p-5 sm:p-6 shadow-xl transition-all hover:border-white/10"
                    >
                      <div className="flex flex-col xl:flex-row gap-6 justify-between items-stretch">
                        
                        {/* Left: General Booking Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                              {reservation.reservation_id}
                            </h3>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getReservationStatusClass(reservation.status)}`}>
                              {reservation.status}
                            </span>
                          </div>
                          
                          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-4">
                              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Customer</p>
                              <p className="mt-2 font-bold text-white text-sm">{reservation.customer_name}</p>
                              <p className="mt-1 text-slate-400 text-xs font-mono">{reservation.phone_number}</p>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-4">
                              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Schedule</p>
                              <p className="mt-2 font-bold text-white text-xs">{formatReservationInterval(reservation)}</p>
                              <p className="mt-1 text-slate-400 text-xs">Guests: <strong className="text-slate-200">{reservation.guest_count}</strong></p>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-4">
                              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Table</p>
                              <p className="mt-2 font-bold text-amber-400 text-xs">{reservation.assigned_table || "Not assigned"}</p>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-4">
                              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Notes</p>
                              <p className="mt-2 text-xs font-medium text-slate-300 line-clamp-2">{reservation.special_request || "No special request"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Administrative Table Assignment Actions with Conditionally Rendered Business Logic */}
                        <div className="w-full xl:w-[280px] shrink-0 rounded-2xl border border-white/5 bg-slate-900/50 p-4 sm:p-5 flex flex-col justify-between gap-4">
                          <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">
                            Workflow Control
                          </span>

                          {isTerminal ? (
                            /* Terminal States (Completed/Cancelled/Rejected) - Lock and prevent edits */
                            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center rounded-xl bg-slate-950/50 border border-white/[0.02] p-4">
                              <span className="text-2xl mb-1">
                                {reservation.status === "completed" ? "✓" : "✕"}
                              </span>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Session {reservation.status}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Order finalized and locked.
                              </p>
                            </div>
                          ) : (
                            /* Active States (Pending/Confirmed) - Expose state-machine triggers */
                            <div className="space-y-3">
                              
                              {/* Table Assignment form (Only relevant for Active bookings) */}
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Table No"
                                  value={tableForm[reservation.reservation_id]?.tableNumber || ""}
                                  onChange={(event) => setTableForm((current) => ({
                                    ...current,
                                    [reservation.reservation_id]: {
                                      ...(current[reservation.reservation_id] || {}),
                                      tableNumber: event.target.value
                                    }
                                  }))}
                                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                                />
                                <select
                                  value={tableForm[reservation.reservation_id]?.seatingType || ""}
                                  onChange={(event) => setTableForm((current) => ({
                                    ...current,
                                    [reservation.reservation_id]: {
                                      ...(current[reservation.reservation_id] || {}),
                                      seatingType: event.target.value
                                    }
                                  }))}
                                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 focus:outline-none"
                                >
                                  <option value="">Zone</option>
                                  <option value="indoor">Indoor</option>
                                  <option value="outdoor">Outdoor</option>
                                  <option value="vip">VIP</option>
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAssignTable(reservation.reservation_id, reservation.status)}
                                className="w-full h-10 rounded-xl bg-white hover:bg-amber-200 text-slate-950 font-black text-xs transition duration-300 shadow-lg"
                              >
                                {isPending ? "Assign & Confirm" : "Assign Table"}
                              </button>

                              {/* Action Row Conditional Switches */}
                              <div className="pt-2 border-t border-white/[0.04] space-y-2">
                                
                                {isPending && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button 
                                      type="button" 
                                      onClick={() => handleReservationStatus(reservation.reservation_id, "confirmed")} 
                                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-400 transition hover:bg-emerald-500 hover:text-white"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => handleReservationStatus(reservation.reservation_id, "rejected")} 
                                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 py-2 text-[10px] font-bold text-rose-400 transition hover:bg-rose-500 hover:text-white"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}

                                {isConfirmed && (
                                  <button 
                                    type="button" 
                                    onClick={() => handleReservationStatus(reservation.reservation_id, "completed")} 
                                    disabled={!canCompleteReservation}
                                    className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-400"
                                  >
                                    ✓ Complete Dinner Session
                                  </button>
                                )}

                                {completionWarning && (
                                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold leading-5 text-amber-200">
                                    {completionWarning}
                                  </p>
                                )}

                                <button 
                                  type="button" 
                                  onClick={() => handleReservationStatus(reservation.reservation_id, "cancelled")} 
                                  className="w-full rounded-xl border border-white/5 bg-slate-900/50 py-2 text-[10px] font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                                >
                                  Cancel Reservation
                                </button>

                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      {reservation.reminder_ready && (
                        <div className="mt-4 rounded-xl border border-white/[0.03] bg-slate-950/40 px-4 py-2 text-[10px] text-slate-500 font-medium">
                          Reminder ready: SMS {reservation.reminder_ready.sms_ready ? "yes" : "no"} · Email {reservation.reminder_ready.email_ready ? "yes" : "no"}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Heatmap Sidebar Section */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Heatmap</p>
              <h2 className="mt-1 text-2xl font-black text-white tracking-tight">Occupancy Windows</h2>

              <div className="mt-5 space-y-4">
                {(analytics?.timeline || []).map((slot) => (
                  <div key={slot.slot_label} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 transition-all hover:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-300">
                      <span className="font-bold text-white">{slot.occupancy_window?.label || slot.slot_label}</span>
                      <span className="font-mono">{slot.booked_seats} seats</span>
                    </div>
                    {/* Intentionally omitted: occupancy window label is implied by the header */}
                    
                    {/* Clean progressive status bar indicator */}
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          slot.booked_seats > 30 ? "bg-rose-500" : slot.booked_seats > 10 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${slot.booked_seats > 0 ? (slot.booked_seats / 40) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-500/10 bg-amber-500/5 p-6 text-amber-100 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Operational Notes</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-amber-100/70 list-disc list-inside">
                <li>Approval actions update reminder readiness automatically.</li>
                <li>Table assignments support indoor, outdoor, and VIP seating zones.</li>
                <li>Heatmap and analytics are driven directly by backend occupancy data metrics.</li>
              </ul>
            </section>
          </aside>

        </div>
      </div>
    </MainLayout>
  );
}