import { resolveMenuImageUrl } from "../../utils/imageUrl";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
};

const formatPrice = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }

  return `Rs. ${numberValue.toFixed(0)}`;
};

export default function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  canDelete,
  canEdit,
  canManageStock
}) {
  const isAvailable = item?.available !== false;
  const fallbackImage =
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

  return (
    <article
      className={`overflow-hidden rounded-[1.75rem] border bg-slate-940/40 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(0,0,0,0.12)] ${
        isAvailable ? "border-gray-100" : "border-rose-100"
      }`}
    >
      <div className="relative h-52 bg-gray-100">
        <img
          src={resolveMenuImageUrl(item.image_url) || fallbackImage}
          alt={item.name || "Menu item"}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />

        <div className="absolute left-4 top-4 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {item.category || "Uncategorized"}
        </div>

        <div
          className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white ${
            isAvailable ? "bg-emerald-500" : "bg-rose-600"
          }`}
        >
          {isAvailable ? "In Stock" : "Out of Stock"}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">{item.name || "Untitled item"}</h3>
            <p className="mt-1 text-sm text-white/60">{item.category || "Uncategorized"}</p>
          </div>

          <div className="text-right">
            <p className="text-lg font-black text-white">{formatPrice(item.price)}</p>
            <p className="text-xs text-white/60">per item</p>
          </div>
        </div>

        <p className="min-h-16 text-sm leading-6 text-gray-400">
          {item.description || "No description available."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-full  px-3 py-2 font-semibold text-slate-400">
            Created: {formatDate(item.created_at)}
          </div>

          {canManageStock && (
            <button
              type="button"
              onClick={() => onToggleAvailability(item)}
              className={`rounded-full px-4 py-2 font-semibold text-white transition ${
                isAvailable ? "col-span-5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isAvailable ? "Mark Out of Stock" : "Mark In Stock"}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Edit
            </button>
          )}

          {canDelete && ( 
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 font-semibold text-rose-400 transition hover:bg-rose-600 hover:text-white"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}