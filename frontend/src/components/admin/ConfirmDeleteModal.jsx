import React from "react";

export default function ConfirmDeleteModal({
  open,
  itemName,
  onClose,
  onConfirm,
  loading
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-slate-900/95 border border-white/10 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95">
        
        {/* Title */}
        <h2 className="text-2xl font-black text-white tracking-tight">
          Delete Menu Item?
        </h2>
        
        {/* Body Text */}
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Are you sure you want to permanently delete{" "}
          <span className="font-bold text-white">"{itemName || "this item"}"</span>?{" "}
          This action is destructive and cannot be undone.
        </p>

        {/* Action Button Row */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-rose-600 px-6 py-3 text-xs font-bold text-white transition-all duration-300 hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Item"}
          </button>
        </div>

      </div>
    </div>
  );
}