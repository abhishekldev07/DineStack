export default function LowStockItems({ items = [] }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Inventory
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Low Stock / Out of Stock
          </h2>
        </div>

        <span className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
          {items.length} alerts
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No unavailable items at the moment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 ring-1 ring-rose-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {item.name || "Unnamed item"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.category || "Uncategorized"}
                  </p>
                </div>

                <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                  Out of stock
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                {item.description || "No description available."}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}