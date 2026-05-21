const CATEGORY_OPTIONS = [
  "Pizza",
  "Burger",
  "Drinks",
  "Desserts",
  "Pasta",
  "Salads",
  "Sides",
  "Other"
];

export default function MenuFormModal({
  open,
  mode,
  formData,
  setFormData,
  imagePreviewUrl,
  imageError,
  onImageChange,
  onImageDrop,
  onRemoveImage,
  hasExistingImage,
  onClose,
  onSubmit,
  loading,
  loadingLabel,
  errorMessage
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/30 bg-gray-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-gray-950 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-300">
              {mode === "edit" ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
            <p className="text-sm text-gray-400">
              {mode === "edit"
                ? "Update item details, pricing, image, or availability."
                : "Create a new dish for the restaurant menu."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid max-h-[calc(100vh-7rem)] gap-5 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-300">Name</span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((previous) => ({
                  ...previous,
                  name: e.target.value
                }))
              }
              className="w-full px-4 py-3 border rounded-2xl bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Pepperoni Pizza"
              required
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-300">Description</span>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((previous) => ({
                  ...previous,
                  description: e.target.value
                }))
              }
              className="w-full min-h-28 rounded-2xl border bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Describe the dish, ingredients, and serving style"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-300">Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData((previous) => ({
                  ...previous,
                  price: e.target.value
                }))
              }
              className="w-full px-4 py-3 border rounded-2xl bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="899"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-300">Category</span>
            <input
              list="menu-categories"
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData((previous) => ({
                  ...previous,
                  category: e.target.value
                }))
              }
              className="w-full px-4 py-3 border rounded-2xl bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Pizza"
              required
            />
            <datalist id="menu-categories">
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-300">Image Upload</span>

            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const droppedFile = event.dataTransfer?.files?.[0];
                onImageDrop(droppedFile);
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-gray-900/70 px-6 py-7 text-center transition hover:border-white/40"
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={onImageChange}
                className="hidden"
              />

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-gray-200">
                Upload Image
              </span>

              <p className="text-xs text-gray-400">
                Drag and drop an image here, or click to browse.
              </p>

              <p className="text-[11px] text-gray-500">
                Allowed: JPG, JPEG, PNG, WEBP. Maximum size: 5MB.
              </p>
            </label>

            {imagePreviewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <img
                  src={imagePreviewUrl}
                  alt="Selected menu item"
                  className="h-52 w-full object-cover"
                />

                <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-gray-950/80 px-4 py-3">
                  <span className="text-xs text-gray-400">
                    {hasExistingImage ? "Current image" : "New image preview"}
                  </span>

                  <button
                    type="button"
                    onClick={onRemoveImage}
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No image selected. A fallback image will be shown in cards.
              </p>
            )}

            {imageError && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {imageError}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 sm:col-span-2 rounded-2xl border-white bg-gray-950/80 px-4 py-4">
            <input
              type="checkbox"
              checked={formData.available}
              onChange={(e) =>
                setFormData((previous) => ({
                  ...previous,
                  available: e.target.checked
                }))
              }
              className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
            />
            <div>
              <span className="block text-sm font-semibold text-gray-200">
                Available for ordering
              </span>
              <span className="text-sm text-gray-400">
                Unavailable items stay visible but cannot be added to cart.
              </span>
            </div>
          </label>

          {errorMessage && (
            <p className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-gray-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-white px-6 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? loadingLabel || "Saving..." : mode === "edit" ? "Update Item" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}