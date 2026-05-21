import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import MenuFormModal from "../components/admin/MenuFormModal";
import ConfirmDeleteModal from "../components/admin/ConfirmDeleteModal";
import MenuItemCard from "../components/admin/MenuItemCard";

import {
  createMenuItem,
  deleteMenuItem,
  getAdminMenuItems,
  updateMenuAvailability,
  updateMenuItem
} from "../services/adminMenuService";
import { resolveMenuImageUrl } from "../utils/imageUrl";

const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  price: "",
  category: "",
  available: true
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const formatPrice = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
};

export default function AdminMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canDelete = user?.role === "admin";
  const canEdit = user?.role === "admin";
  const canAdd = user?.role === "admin";
  const canManageStock = user?.role === "admin" || user?.role === "staff";

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAdminMenuItems();
      const nextItems = Array.isArray(data) ? data : [];

      nextItems.sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();

        return rightTime - leftTime;
      });

      setMenuItems(nextItems);
    } catch (error) {
      console.error(error);
      setMenuItems([]);
      setErrorMessage("Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  const categoryOptions = useMemo(() => {
    const categories = new Set();

    menuItems.forEach((item) => {
      if (item?.category) {
        categories.add(item.category);
      }
    });

    return ["all", ...Array.from(categories)];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    const query = normalizeText(searchInput);

    return menuItems.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" ||
        normalizeText(item?.category) === normalizeText(categoryFilter);

      const matchesSearch =
        !query ||
        normalizeText(item?.name).includes(query) ||
        normalizeText(item?.category).includes(query);

      const matchesStockStatus =
        stockStatusFilter === "all" ||
        (stockStatusFilter === "in-stock" && item?.available !== false) ||
        (stockStatusFilter === "out-of-stock" && item?.available === false);

      return matchesCategory && matchesSearch && matchesStockStatus;
    });
  }, [categoryFilter, stockStatusFilter, menuItems, searchInput]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, categoryFilter, stockStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMenuItems.length / itemsPerPage));

  const paginatedMenuItems = filteredMenuItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => {
    if (!canAdd) {
      return;
    }

    setFormMode("add");
    setFormData(EMPTY_FORM);
    setEditTarget(null);
    setFormError("");
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setImageError("");
    setRemoveImage(false);
    setIsFormOpen(true);
  };

  const openEditModal = (item) => {
    if (!canEdit) {
      return;
    }

    setFormMode("edit");
    setFormData({
      id: item?.id || null,
      name: item?.name || "",
      description: item?.description || "",
      price: item?.price ?? "",
      category: item?.category || "",
      available: item?.available !== false
    });
    setEditTarget(item);
    setDeleteTarget(null);
    setFormError("");
    setSelectedImageFile(null);
    setImagePreviewUrl(resolveMenuImageUrl(item?.image_url));
    setImageError("");
    setRemoveImage(false);
    setIsFormOpen(true);
  };

  const resetImagePreviewBlob = (nextUrl = "") => {
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return nextUrl;
    });
  };

  const validateAndSetImage = (file) => {
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("Image size must be 5MB or less.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImageError("");
    setRemoveImage(false);
    resetImagePreviewBlob(previewUrl);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    validateAndSetImage(file);

    event.target.value = "";
  };

  const handleImageDrop = (file) => {
    validateAndSetImage(file);
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImageError("");
    resetImagePreviewBlob("");

    if (formMode === "edit") {
      setRemoveImage(true);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormError("");
    setIsSaving(false);
    setEditTarget(null);
    setSelectedImageFile(null);
    setImageError("");
    setRemoveImage(false);
    resetImagePreviewBlob("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: formatPrice(formData.price),
      category: formData.category.trim(),
      available: Boolean(formData.available),
      imageFile: selectedImageFile,
      removeImage
    };

    if (!payload.name || !payload.category) {
      setFormError("Name and category are required.");
      return;
    }

    if (imageError) {
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      if (formMode === "edit") {
        await updateMenuItem(editTarget?.id || formData.id, payload);
      } else {
        await createMenuItem(payload);
      }

      closeForm();
      await loadMenuItems();
    } catch (error) {
      console.error(error);
      setFormError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to save menu item."
      );
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    if (!canManageStock) {
      return;
    }

    try {
      await updateMenuAvailability(item.id, item.available === false);

      await loadMenuItems();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to update stock status."
      );
    }
  };

  const handleDeleteRequest = (item) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      await loadMenuItems();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to delete menu item."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-slate-100">
        
        {/* Page Header */}
        <div className="mb-10 rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-850 p-8 sm:p-10 border border-white/5 overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.02),_transparent_30%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">
                Admin Kitchen Dashboard
              </p>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                Menu Management
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                Create dishes, edit details, manage stock, and keep the restaurant menu current for customers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 relative shrink-0">
              {canAdd && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-slate-100"
                >
                  Add Menu Item
                </button>
              )}

              <button
                type="button"
                onClick={loadMenuItems}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Items</p>
            <p className="mt-2 text-3xl font-black text-white font-mono">{menuItems.length}</p>
          </div>

          <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available</p>
            <p className="mt-2 text-3xl font-black text-emerald-400 font-mono">
              {menuItems.filter((item) => item.available !== false).length}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Out of Stock</p>
            <p className="mt-2 text-3xl font-black text-rose-400 font-mono">
              {menuItems.filter((item) => item.available === false).length}
            </p>
          </div>
        </div>

        {/* Search and Filters panel */}
        <div className="mb-8 rounded-3xl bg-slate-900/40 border border-white/5 p-5 sm:p-6 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
                Search menu items
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search food items..."
                className="w-full px-4 py-3 border border-slate-700/60 rounded-2xl bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-slate-500 transition"
              />
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setCategoryFilter("all");
                  setStockStatusFilter("all");
                }}
                className="w-full lg:w-auto px-5 py-3 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700/60 font-semibold hover:bg-slate-700 transition text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="mt-6">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-3">
              Filter by Category
            </span>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const isActive = categoryFilter === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                      isActive
                        ? "bg-slate-200 text-blue-950"
                        : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {category === "all"
                      ? "All"
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock Status */}
          <div className="mt-5">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-3">
              Filter by Stock
            </span>
            <div className="flex flex-wrap gap-2">
              {["all", "in-stock", "out-of-stock"].map((status) => {
                const isActive = stockStatusFilter === status;
                const labels = {
                  all: "All Statuses",
                  "in-stock": "In Stock",
                  "out-of-stock": "Out Of Stock"
                };

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStockStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                      isActive
                        ? "bg-slate-200 text-blue-950 "
                        : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-400">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-3xl bg-slate-900/30 border border-white/5 p-5 shadow-lg animate-pulse">
                <div className="mb-4 h-52 rounded-2xl bg-slate-800" />
                <div className="mb-3 h-5 w-2/3 rounded bg-slate-800" />
                <div className="mb-2 h-4 w-full rounded bg-slate-800" />
                <div className="mb-2 h-4 w-5/6 rounded bg-slate-800" />
                <div className="h-10 w-full rounded bg-slate-850" />
              </div>
            ))}
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/30 border border-white/5 p-10 text-center shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white">No menu items found</h2>
            <p className="mt-2 text-slate-400 text-sm">
              Try a different search term or clear the category filter.
            </p>
          </div>
        ) : ( 
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedMenuItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  canManageStock={canManageStock}
                  onEdit={openEditModal}
                  onDelete={handleDeleteRequest}
                  onToggleAvailability={handleToggleAvailability}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-white/5 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Items per page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 text-white rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-none"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700/50 disabled:opacity-40 hover:bg-slate-755 transition"
                >
                  Prev
                </button>

                <span className="text-xs font-bold text-slate-300 bg-slate-950/40 px-3 py-2 rounded-xl border border-white/5">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700/50 disabled:opacity-40 hover:bg-slate-755 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <MenuFormModal
        open={isFormOpen}
        mode={formMode}
        formData={formData}
        setFormData={setFormData}
        imagePreviewUrl={imagePreviewUrl}
        imageError={imageError}
        onImageChange={handleImageChange}
        onImageDrop={handleImageDrop}
        onRemoveImage={handleRemoveImage}
        hasExistingImage={Boolean(editTarget?.image_url) && !removeImage && !selectedImageFile}
        onClose={closeForm}
        onSubmit={handleSubmit}
        loading={isSaving}
        loadingLabel={selectedImageFile ? "Uploading & Saving..." : "Saving..."}
        errorMessage={formError}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        itemName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </MainLayout>
  );
}