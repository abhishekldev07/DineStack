import ProfileCard from "../ProfileCard";

export default function UserProfileModal({
  open,
  profile,
  loading,
  error,
  onClose
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-slate-100 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.35)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4 px-1 sm:px-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              User Profile
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Profile Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="rounded-[2rem] bg-white p-8 text-center text-slate-500 shadow-lg">
            Loading profile...
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 shadow-lg">
            {error}
          </div>
        ) : profile ? (
          <ProfileCard
            profile={profile}
            showOrderCount={profile.role === "customer"}
            showReservationCount={profile.role === "customer"}
            reservationCount={profile?.reservation_count ?? 0}
            title={profile.username || "User Profile"}
            subtitle="Account snapshot"
          />
        ) : null}
      </div>
    </div>
  );
}