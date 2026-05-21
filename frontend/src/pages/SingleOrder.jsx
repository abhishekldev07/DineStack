import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import OrderBadges from "../components/OrderBadges";

import {
  getSingleOrder,
  cancelOrder,
  editOrder
} from "../services/orderService";

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }
  return `Rs. ${numberValue.toFixed(0)}`;
};

export default function SingleOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editableItems, setEditableItems] = useState([]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await getSingleOrder(orderId);
      setOrder(data);
      setEditableItems(data?.items || []);
    } catch (error) {
      console.error("Failed to load order detail", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    try {
      await cancelOrder(orderId);
      fetchOrder();
    } catch (error) {
      console.error("Failed to cancel order", error);
    }
  };

  const increaseQuantity = (menuItemId) => {
    const updatedItems = editableItems.map((item) =>
      item.menu_item_id === menuItemId
        ? {
            ...item,
            quantity: item.quantity + 1,
            subtotal: (item.subtotal / item.quantity) * (item.quantity + 1)
          }
        : item
    );
    setEditableItems(updatedItems);
  };

  const decreaseQuantity = (menuItemId) => {
    const updatedItems = editableItems.map((item) => {
      if (item.menu_item_id === menuItemId && item.quantity > 1) {
        return {
          ...item,
          quantity: item.quantity - 1,
          subtotal: (item.subtotal / item.quantity) * (item.quantity - 1)
        };
      }
      return item;
    });
    setEditableItems(updatedItems);
  };

  const removeItem = (menuItemId) => {
    const updatedItems = editableItems.filter(
      (item) => item.menu_item_id !== menuItemId
    );
    setEditableItems(updatedItems);
  };

  const handleSaveChanges = async () => {
    try {
      const formattedItems = editableItems.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity
      }));

      await editOrder(orderId, formattedItems);
      navigate("/my-orders", { replace: true });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-400 animate-pulse text-lg font-medium">Loading order details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-rose-400 font-semibold text-lg">Unable to find order details.</p>
        </div>
      </MainLayout>
    );
  }

  const isPending = order.status === "pending";

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 text-slate-100">
        
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          {/* HEADER ROW DISPLAY */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Order #{order.order_id}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            
            <div className="shrink-0">
              <OrderBadges
                status={order.status}
                paymentStatus={order.payment_status}
                paymentMethod={order.payment_method}
              />
            </div>
          </div>

          {/* ORDER ITEMS LIST BLOCK */}
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 block">
              Cart Items
            </h3>
            
            <div className="bg-slate-950/40 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {editableItems.map((item) => {
                const itemPrice = item.subtotal / item.quantity;
                return (
                  <div
                    key={item.menu_item_id}
                    className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition hover:bg-white/[0.01]"
                  >
                    {/* Item Info columns */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {item.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Price per item: <span className="text-slate-300 font-mono font-medium">{formatCurrency(itemPrice)}</span>
                      </p>
                    </div>

                    {/* Quantity controls & dynamic adjustment triggers */}
                    <div className="flex flex-wrap items-center gap-5 justify-between md:justify-end">
                      {isPending ? (
                        <div className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-white/5">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.menu_item_id)}
                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center justify-center font-bold text-sm"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-mono font-semibold text-sm text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.menu_item_id)}
                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center justify-center font-bold text-sm"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full select-none">
                          Qty: {item.quantity}
                        </span>
                      )}

                      {/* Remove item layout trigger */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.menu_item_id)}
                          className="rounded-full bg-rose-500/10 border border-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-600 hover:text-white hover:border-transparent"
                        >
                          Remove
                        </button>
                      )}

                      {/* Line Subtotal */}
                      <div className="min-w-[100px] text-right">
                        <span className="text-sm font-bold text-white font-mono">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOTAL + CTA PANEL */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Order Total
              </p>
              <h2 className="text-3xl font-black text-white mt-1 font-mono">
                {formatCurrency(
                  editableItems.reduce((total, item) => total + item.subtotal, 0)
                )}
              </h2>
            </div>

            {/* State Management CTA Controls */}
            {isPending && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="flex-1 sm:flex-initial rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition-all duration-300 hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="flex-1 sm:flex-initial rounded-full bg-rose-500/10 border border-rose-500/20 px-6 py-3 text-xs font-semibold text-rose-400 transition-all duration-300 hover:bg-rose-650 hover:text-white hover:border-transparent"
                >
                  Cancel Order
                </button>
              </div>
            )}
            
          </div>

        </div>
      </div>
    </MainLayout>
  );
}