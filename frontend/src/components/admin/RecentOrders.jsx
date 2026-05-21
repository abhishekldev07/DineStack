const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  preparing: "bg-orange-50 text-orange-700 ring-orange-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  default: "bg-slate-50 text-slate-700 ring-slate-200"
};

const PAYMENT_STYLES = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  refunded: "bg-violet-50 text-violet-700 ring-violet-200",
  default: "bg-slate-50 text-slate-700 ring-slate-200"
};

function getBadgeClass(map, value) {
  return map[String(value || "").toLowerCase()] || map.default;
}

export default function RecentOrders({ orders = [] }) {
  return (
    <section className="w-full rounded-[2rem] bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Operations
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Recent Orders
          </h2>
        </div>

        <span className="inline-flex self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 sm:self-auto">
          Latest {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No recent orders available.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.order_id || order.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold text-slate-900">
                    Order #{order.order_id || order.id}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 sm:gap-x-6">
                    <span className="break-words">
                      Customer ID: <span className="font-semibold text-slate-900">{order.user_id ?? "—"}</span>
                    </span>
                    <span className="break-words">
                      Total: <span className="font-semibold text-slate-900">Rs. {Number(order.total_price) || 0}</span>
                    </span>
                    <span className="break-words">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getBadgeClass(STATUS_STYLES, order.status)}`}>
                    {order.status || "unknown"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getBadgeClass(PAYMENT_STYLES, order.payment_status)}`}>
                    {order.payment_status || "unknown"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}