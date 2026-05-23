import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { getMenuItems } from "../services/menuService";
import { CartContext } from "../context/CartContext";
import useRole from "../hooks/useRole";
import { resolveMenuImageUrl } from "../utils/imageUrl";

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }
  return `Rs. ${numberValue.toFixed(0)}`;
};

export default function Menu() {
  const location = useLocation() || { search: "" };
  const navigate = useNavigate();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [focusedItemId, setFocusedItemId] = useState(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [imageLoaded, setImageLoaded] = useState({});
  const itemRefs = useRef({});

  // Safety fallback wraps to prevent white screens if contexts or hooks evaluate to undefined
  const cartContext = useContext(CartContext);
  const addToCart = cartContext?.addToCart || (() => {});

  const role = useRole() || {};
  const isCustomer = role.isCustomer ?? false;
  const isLoggedIn = role.isLoggedIn ?? false;

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getMenuItems();
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load menu items", error);
      setMenuItems([]);
      setErrorMessage("Unable to load menu right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryCategory = params.get("category");
    const queryItemId = params.get("item");

    if (queryCategory) {
      setActiveCategory(queryCategory);
      setSearchInput("");
    }

    if (queryItemId) {
      setFocusedItemId(String(queryItemId));
      setHighlightedItemId(String(queryItemId));
      setSearchInput("");
    }
  }, [location.search]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set();
    menuItems.forEach((item) => {
      if (item?.category) {
        uniqueCategories.add(item.category);
      }
    });
    return ["all", ...Array.from(uniqueCategories)];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    const query = normalizeText(searchInput);
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" ||
        normalizeText(item?.category) === normalizeText(activeCategory);
      const matchesSearch =
        !query ||
        normalizeText(item?.name).includes(query) ||
        normalizeText(item?.description).includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, menuItems, searchInput]);

  useEffect(() => {
    if (!focusedItemId) return;

    const targetItem = menuItems.find((item) => String(item?.id) === String(focusedItemId));
    if (targetItem?.category) {
      setActiveCategory(targetItem.category);
    }
  }, [focusedItemId, menuItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, activeCategory]);

  const interleaveByCategory = (items, limit = 12) => {
    const groups = {};
    items.forEach((it) => {
      const cat = it?.category || "uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });

    const cats = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

    const result = [];
    let idx = 0;
    while (result.length < limit) {
      let added = false;
      for (const c of cats) {
        if (groups[c][idx]) {
          result.push(groups[c][idx]);
          if (result.length >= limit) break;
          added = true;
        }
      }
      if (!added) break;
      idx++;
    }

    return result;
  };

  // Compute total pages taking into account that page 1 is a special interleaved selection
  const totalPages = useMemo(() => {
    const total = filteredMenuItems.length;
    if (total <= itemsPerPage) return 1;
    const page1Count = Math.min(itemsPerPage, total);
    const remaining = total - page1Count;
    return 1 + Math.max(0, Math.ceil(remaining / itemsPerPage));
  }, [filteredMenuItems, itemsPerPage]);

  useEffect(() => {
    if (!focusedItemId) return;

    const targetIndex = filteredMenuItems.findIndex(
      (item) => String(item?.id) === String(focusedItemId)
    );

    if (targetIndex >= 0) {
      const nextPage = Math.floor(targetIndex / itemsPerPage) + 1;
      setCurrentPage(nextPage);
    }
  }, [filteredMenuItems, focusedItemId, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    if (filteredMenuItems.length === 0) return [];

    const page1Items = interleaveByCategory(filteredMenuItems, itemsPerPage);

    if (currentPage === 1) return page1Items;

    // For pages after the first, remove items already shown on page 1
    const page1Ids = new Set(page1Items.map((it) => String(it.id)));
    const remaining = filteredMenuItems.filter((it) => !page1Ids.has(String(it.id)));

    const pageIndex = currentPage - 2; // page 2 => index 0
    const start = pageIndex * itemsPerPage;
    return remaining.slice(start, start + itemsPerPage);
  }, [filteredMenuItems, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!focusedItemId) return;

    const isOnCurrentPage = paginatedItems.some(
      (item) => String(item?.id) === String(focusedItemId)
    );

    if (!isOnCurrentPage) return;

    const targetEl = itemRefs.current[String(focusedItemId)];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

      const timeoutId = window.setTimeout(() => {
        setHighlightedItemId(null);
        setFocusedItemId(null);
      }, 2200);

      return () => window.clearTimeout(timeoutId);
    }
  }, [currentPage, focusedItemId, paginatedItems]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        
        {/* Page Header */}
        <div className="mb-10 rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-850 text-white p-8 sm:p-10 border border-white/5 overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.05),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.02),_transparent_30%)]" />
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">
              Explore the kitchen
            </p>
            <h1 className="text-4xl sm:text-5xl font-black mb-3">
              Our Menu
            </h1>
            <p className="text-slate-300 max-w-2xl text-base sm:text-lg">
              Browse fresh dishes, filter by category, search your favorites, and add available items to your cart.
            </p>
          </div>
        </div>

        {/* Search and Filters Panel */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl shadow-lg p-5 sm:p-6 mb-8 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
                Search food
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search food items..."
                className="w-full px-4 py-3 border border-slate-700/60 rounded-2xl bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-slate-500 transition"
              />
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setActiveCategory("all");
                }}
                className="w-full lg:w-auto px-5 py-3 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700/60 font-semibold hover:bg-slate-700 transition text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-6">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-3">
              Browse by Category
            </span>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                      isActive
                        ? "bg-slate-200 text-blue-950 "
                        : "bg-slate-900/50 text-slate-400/80 border-white/10 hover:bg-slate-800 hover:text-slate-300"
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
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl bg-slate-900/30 border border-white/5 p-5 shadow-lg animate-pulse"
              >
                <div className="h-48 rounded-2xl bg-slate-800 mb-4" />
                <div className="h-5 w-2/3 bg-slate-800 rounded mb-3" />
                <div className="h-4 w-full bg-slate-800 rounded mb-2" />
                <div className="h-4 w-5/6 bg-slate-800 rounded mb-5" />
                <div className="h-10 w-full bg-slate-850 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-8 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-white">Something went wrong</h2>
            <p className="text-slate-400 mb-5 text-sm">{errorMessage}</p>
            <button
              type="button"
              onClick={fetchMenu}
              className="px-5 py-3 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-100 transition text-sm"
            >
              Try Again
            </button>
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-10 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-white">No dishes found</h2>
            <p className="text-slate-400 text-sm">
              Try a different search term or category.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedItems.map((item) => {
                const isAvailable = item?.available !== false;
                const isHighlighted = String(highlightedItemId) === String(item?.id);
                const fallbackImage =
                  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

                return (
                  <article
                    key={item.id}
                    ref={(element) => {
                      if (element) {
                        itemRefs.current[String(item.id)] = element;
                      }
                    }}
                    className={`group overflow-hidden rounded-[2rem] bg-slate-900/30 backdrop-blur-md border border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-2xl ${
                      isAvailable ? "" : "opacity-90"
                    } ${isHighlighted ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900" : ""}`}
                  >
                    {/* Image Header */}
                    <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-800">
                      <img
                        src={resolveMenuImageUrl(item.image_url) || fallbackImage}
                        alt={item.name || "Menu item"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onLoad={() => setImageLoaded((s) => ({ ...s, [item.id]: true }))}
                        onError={(event) => {
                          event.currentTarget.src = fallbackImage;
                          setImageLoaded((s) => ({ ...s, [item.id]: true }));
                        }}
                      />

                      {/* Skeleton overlay while image loads */}
                      {!imageLoaded[String(item.id)] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
                        </div>
                      )}

                      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur">
                        <span>{item.category || "Uncategorized"}</span> 
                      </div>

                      <div
                        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
                          isAvailable ? "bg-emerald-500 text-white" : "bg-rose-600 text-white"
                        }`}
                      >
                        {isAvailable ? "Available" : "Out of Stock"}
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-bold text-white line-clamp-1 group-hover:text-amber-200 transition-colors">
                            {item.name || "Untitled item"}
                          </h2>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-white">{formatCurrency(item.price)}</p>
                          <p className="text-[10px] uppercase tracking-wider text-white/45">per item</p>
                        </div>
                      </div>

                      <p className="min-h-12 text-sm leading-relaxed text-slate-400 line-clamp-2">
                        {item.description || "No description available."}
                      </p>

                      {/* Bottom action row with pulsed status dot indicator */}
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.04] pt-4">
                        
                        <div className="flex items-center gap-2 select-none">
                          {isAvailable ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="text-xs font-semibold text-emerald-400/95">Ready to order</span>
                            </>
                          ) : (
                            <>
                              <span className="h-2 w-2 rounded-full bg-rose-500/80"></span>
                              <span className="text-xs font-semibold text-slate-500">Unavailable</span>
                            </>
                          )}
                        </div>

                        {/* Button context rendering */}
                        {isCustomer ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAvailable) return;

                              addToCart(item);
                              navigate("/cart");
                            }}
                            disabled={!isAvailable}
                            className="rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-950 transition-all duration-300 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                          >
                            Add to Cart
                          </button>
                        ) : isLoggedIn ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400">
                            View Only
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20"
                          >
                            Login to Order
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination settings wrapper */}
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
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
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
          </div>
        )}
      </div>
    </MainLayout>
  );
}