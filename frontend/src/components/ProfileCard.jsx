const ROLE_STYLES = {
  customer:
    "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40",

  staff:
    "bg-sky-900/40 text-sky-300 border border-sky-700/40",

  admin:
    "bg-amber-900/40 text-amber-300 border border-amber-700/40"
};

const formatMemberSince = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const formatCreatedAt = (value) => formatMemberSince(value);

export default function ProfileCard({
  profile,
  title = "Account Overview",
  subtitle = "Profile details",
  showOrderCount = false,
  showReservationCount = false,
  reservationCount = 0,
  actions = null,
  className = ""
}) {
  const role = String(profile?.role || "").toLowerCase();

  const initials =
    String(profile?.username || "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  const badgeClassName =
    ROLE_STYLES[role] ||
    "bg-zinc-900 text-zinc-300 border border-zinc-700";

  return (
    <section
  className={
    "rounded-[2rem] border border-white/10 " +
    "bg-gradient-to-br from-zinc-950 via-black to-zinc-900 " +
    "shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl " +
    className
  }
>
      <div className="grid gap-6 p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:p-8">

        {/* Avatar */}
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-zinc-800 bg-zinc-950 px-6 py-8 text-white">

          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-4xl font-black shadow-inner shadow-black/60">
            {initials}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Avatar
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-500">
                {subtitle}
              </p>

              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                {title}
              </h2>
            </div>

            <span
              className={
                "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold " +
                badgeClassName
              }
            >
              {role || "guest"}
            </span>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {/* Username */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Username
              </p>

              <p className="mt-2 break-words text-lg font-semibold text-white">
                {profile?.username || "—"}
              </p>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Email
              </p>

              <p className="mt-2 break-words text-lg font-semibold text-white">
                {profile?.email || "—"}
              </p>
            </div>

            {/* Member Since */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Member Since
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {formatMemberSince(profile?.created_at)}
              </p>
            </div>

            {/* Created At (removed - duplicate of Member Since) */}

            {/* Orders */}
            {showOrderCount && role === "customer" ? (
              <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/40 p-4 sm:col-span-2 xl:col-span-3">

                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Total Orders
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-200">
                  {Number(profile?.order_count || 0)}
                </p>
              </div>
            ) : null}

            {/* Reservations */}
            {showReservationCount && role === "customer" ? (
              <div className="rounded-2xl border border-amber-700/40 bg-amber-950/40 p-4 sm:col-span-2 xl:col-span-3">

                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Total Reservations
                </p>

                <p className="mt-2 text-3xl font-black text-amber-200">
                  {Number(reservationCount || profile?.reservation_count || 0)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          {actions ? (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}