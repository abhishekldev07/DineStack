const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

export default function TopItems({ items = [] }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Analytics
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Top Selling Items
          </h2>
        </div>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No top-selling item data is available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.menu_item_id || item.name}-${index}`} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 transition hover:bg-white">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900">
                  {item.name || "Unnamed item"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {currencyFormatter.format(Number(item.total_quantity_sold) || 0)} sold
                </p>
              </div>

              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                Qty {Number(item.total_quantity_sold) || 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}