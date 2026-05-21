import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import OrderBadges from "../components/OrderBadges";
import {
  getAllOrders,
  getOrdersByStatus,
  updateOrderStatus,
  searchOrders
} from "../services/adminOrderService";
import { updatePaymentStatus } from "../services/paymentService";

const PAYMENT_FILTERS = [
  { label: "All Payments", value: "all" },
  { label: "Pending", value: "pending_payment" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" }
];

const normalizeStatusValue = (value) => {
  return String(value ?? "").trim().toLowerCase();
};

const normalizePaymentStatusValue = (value) => {
  const normalizedValue = normalizeStatusValue(value);

  if (normalizedValue === "pending") {
    return "pending_payment";
  }

  return normalizedValue;
};

const hasGpsCoordinates = (order) => {
  return order?.latitude !== null &&
    order?.latitude !== undefined &&
    order?.longitude !== null &&
    order?.longitude !== undefined;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("order");
  const [activeSearch, setActiveSearch] = useState(null);

  const isSearchActive = useMemo(() => activeSearch !== null, [activeSearch]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      let data;

      const normalizedStatusFilter = normalizeStatusValue(statusFilter);
      const normalizedPaymentFilter = normalizePaymentStatusValue(paymentFilter);
      const paymentStatusParam =
        normalizedPaymentFilter === "all" ? undefined : normalizedPaymentFilter;

      if (activeSearch) {
        data = await searchOrders(activeSearch.type, activeSearch.query, {
          status: normalizedStatusFilter === "all" ? undefined : normalizedStatusFilter,
          paymentStatus: paymentStatusParam
        });
      } else if (normalizedStatusFilter === "all") {
        data = await getAllOrders(page, limit, paymentStatusParam);
      } else {
        data = await getOrdersByStatus(
          normalizedStatusFilter,
          page,
          limit,
          paymentStatusParam
        );
      }

      const nextOrders = Array.isArray(data?.orders) ? data.orders : [];
      setOrders(nextOrders);
    } catch (error) {
      console.error(error);
      setOrders([]);
      setErrorMessage(
        error?.response?.data?.error || "Failed to fetch orders"
      );
    } finally {
      setLoading(false);
    }
  }, [activeSearch, limit, page, paymentFilter, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = searchInput.trim();

    if (!trimmedQuery) {
      setActiveSearch(null);
      setPage(1);
      setErrorMessage("");
      return;
    }

    if (searchType === "order" || searchType === "user") {
      if (!/^\d+$/.test(trimmedQuery)) {
        setErrorMessage("Search value must be a numeric ID");
        return;
      }
    }

    setErrorMessage("");
    setPage(1);
    setActiveSearch({
      type: searchType,
      query: trimmedQuery
    });
  };

  const clearSearch = () => {
    setSearchInput("");
    setActiveSearch(null);
    setStatusFilter("all");
    setPaymentFilter("all");
    setPage(1);
    setErrorMessage("");
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      await fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePaymentUpdate = async (paymentId, status) => {
    try {
      await updatePaymentStatus(paymentId, status);
      await fetchOrders();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-10 text-slate-100">
        <h1 className="text-4xl font-extrabold tracking-tight mb-10 text-white">
          Manage Orders
        </h1>

        {/* SEARCH BAR */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-900/40 p-4 rounded-2xl border border-white/5"
        >
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white font-medium focus:outline-none focus:border-slate-500"
          >
            <option value="order">Order ID</option>
            <option value="user">User ID</option>
            <option value="customer">Customer Name</option>
          </select>

          <input
            type="text"
            placeholder={
              searchType === "customer"
                ? "Search by customer name..."
                : `Search by ${searchType} ID...`
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 md:flex-initial bg-white text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition whitespace-nowrap"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="flex-1 md:flex-initial bg-slate-800 text-slate-300 font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 border border-slate-700 transition whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </form>

        {errorMessage && (
          <p className="text-rose-400 mb-6 font-semibold bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
            {errorMessage}
          </p>
        )}

        {/* CONTROLS SECTION */}
        <div className="space-y-4 mb-10">
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Filter Status
            </span>
            <div className="flex gap-2 flex-wrap">
              {["all", "pending", "preparing", "delivered", "cancelled"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setPage(1);
                    setStatusFilter(status);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition capitalize ${
                    statusFilter === status
                      ? "bg-slate-200 text-blue-950 border border-blue-500/20"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Filter Payments
            </span>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_FILTERS.map((payment) => (
                <button
                  key={payment.value}
                  onClick={() => {
                    setPage(1);
                    setPaymentFilter(payment.value);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition capitalize ${
                    normalizePaymentStatusValue(paymentFilter) === payment.value
                      ? "bg-slate-200 text-blue-950 border border-blue-500/20"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {payment.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ORDERS LIST */}
        {loading ? (
          <h2 className="text-xl text-slate-400 animate-pulse">Loading orders...</h2>
        ) : orders.length === 0 ? (
          <h2 className="text-xl text-slate-400">No matching orders found.</h2>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              // Contextual control flags to clear screen noise
              const normalizedOrderStatus = normalizeStatusValue(order.status);
              const normalizedPaymentStatus = normalizePaymentStatusValue(
                order.payment_status
              );

              const isPending = normalizedOrderStatus === "pending";
              const isPreparing = normalizedOrderStatus === "preparing";
              const isDelivered = normalizedOrderStatus === "delivered";
              const isCancelled = normalizedOrderStatus === "cancelled";
              const isPaid = normalizedPaymentStatus === "paid";
              const isRefunded = normalizedPaymentStatus === "refunded";

              return (
                <div
                  key={order.order_id}
                  className="w-full mx-auto rounded-2xl bg-slate-900/30 border border-white/5 p-5 sm:p-6 shadow-xl"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-start">
                    
                    {/* LEFT CONTAINER: INFO DETAILS */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold tracking-tight sm:text-2xl text-white">
                        Order #{order.order_id}
                      </h2>
                      
                      <div className="mt-4 space-y-1 text-sm text-slate-400">
                        <p>Customer: <span className="font-semibold text-slate-200">{order.customer_name ? `${order.customer_name} (${order.user_id})` : order.user_id}</span></p>
                        <p>Total Charge: <span className="font-bold text-white">Rs. {order.total_price}</span></p>
                        <p>Placed At: <span className="text-slate-300">{new Date(order.created_at).toLocaleString()}</span></p>
                      </div>

                      <div className="mt-4">
                        <OrderBadges
                          status={order.status}
                          paymentStatus={order.payment_status}
                          paymentMethod={order.payment_method}
                        />
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/50 p-4 sm:p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Delivery Details
                        </h3>

                        <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
                          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/[0.03]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Phone
                            </p>
                            <p className="font-medium text-white break-words">
                              {order.phone_number || "No phone number provided"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/[0.03]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Address
                            </p>
                            {hasGpsCoordinates(order) ? (
                              <p className="font-medium text-slate-200 break-words">
                                GPS location enabled
                              </p>
                            ) : (
                              <p className="font-medium text-white break-words whitespace-pre-wrap">
                                {order.delivery_address || "No delivery address provided"}
                              </p>
                            )}
                          </div>
                        </div>

                        {hasGpsCoordinates(order) ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-slate-950 shadow-inner">
                            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Live Location
                                </p>
                                <p className="text-sm text-slate-200">
                                  {Number(order.latitude).toFixed(5)}, {Number(order.longitude).toFixed(5)}
                                </p>
                              </div>
                            </div>

                            <iframe
                              title={`Order ${order.order_id} delivery location`}
                              src={`https://maps.google.com/maps?q=${order.latitude},${order.longitude}&z=15&output=embed`}
                              className="h-[250px] w-full"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* ITEMS WRAPPER BOX */}
                      <div className="mt-5 w-full rounded-xl bg-slate-950/60 p-4 border border-white/[0.02]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Ordered Menu Items
                        </h3>
                        {order.items && order.items.length ? (
                          <div className="space-y-3 divider-y divider-slate-800">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                <div>
                                  <span className="font-medium text-slate-200">{it.name || "Item"}</span>
                                  <span className="text-slate-500 mx-2 text-xs">× {it.quantity}</span>
                                  <p className="text-xs text-slate-500">Rs. {it.price} each</p>
                                </div>
                                <div className="text-xs font-bold text-slate-300 whitespace-nowrap">
                                  Subtotal: Rs. {it.subtotal}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No items specified in this invoice payload.</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT CONTAINER: CLEAN WORKFLOW ACTION BADGES */}
                    <div className="flex flex-col gap-3 min-w-[180px] w-full md:w-auto bg-slate-950/30 p-4 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase block mb-1">
                        Workflow Actions
                      </span>

                      {/* 1. Core Order Pipeline Controls */}
                      {isPending && (
                        <button
                          onClick={() => handleStatusUpdate(order.order_id, "preparing")}
                          className="w-full text-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-500"
                        >
                          Accept & Prepare
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => handleStatusUpdate(order.order_id, "delivered")}
                          className="w-full text-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {/* 2. Ledger Billing Controls */}
                      {!isPaid && !isCancelled && !isRefunded && order.payment_id && (
                        <button
                          onClick={() => handlePaymentUpdate(order.payment_id, "paid")}
                          className="w-full text-center rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 hover:bg-slate-700 px-4 py-2 text-xs font-bold transition"
                        >
                          Mark Paid
                        </button>
                      )}

                      {isDelivered && isPaid && order.payment_id && (
                        <button
                          onClick={() => handlePaymentUpdate(order.payment_id, "refunded")}
                          className="w-full text-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 px-4 py-2 text-xs font-bold transition"
                        >
                          Issue Refund
                        </button>
                      )}

                      {/* 3. Subtle Danger Actions (Hidden if finalized) */}
                      {(isPending || isPreparing) && (
                        <button
                          onClick={() => handleStatusUpdate(order.order_id, "cancelled")}
                          className="w-full text-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-transparent px-4 py-2 text-xs font-semibold transition"
                        >
                          Cancel Order
                        </button>
                      )}

                      {/* Fallback indicator if no modifications are logical anymore */}
                      {(isCancelled || (isDelivered && isRefunded)) && (
                        <span className="text-xs font-medium text-slate-500 text-center italic py-2">
                          Order Finalized
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION PANEL */}
        {!isSearchActive && !loading && orders.length > 0 && (
          <div className="flex gap-4 mt-12 items-center justify-center">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition hover:bg-slate-700"
            >
              Previous
            </button>
            <p className="font-semibold text-sm text-slate-300">
              Page {page}
            </p>
            <button
              onClick={() => setPage(page + 1)}
              disabled={orders.length < limit}
              className="bg-white text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition hover:bg-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}