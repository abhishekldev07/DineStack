import React, { useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { CartContext } from "../context/CartContext";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath } from "../utils/roleUtils";

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }
  return `Rs. ${numberValue.toFixed(0)}`;
};

export default function Cart() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalPrice
  } = useContext(CartContext) || {};
  
  const { role, isCustomer } = useRole() || {};
  const navigate = useNavigate();

  if (!isCustomer) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  const handleCheckout = () => {
    if (!cartItems || cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }
    navigate("/checkout");
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 text-slate-100">
        
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          {/* Header Row */}
          <div className="pb-6 border-b border-white/5 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Your Cart</h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
              Review items and adjust quantities before placing your order
            </p>
          </div>

          {!cartItems || cartItems.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-bold text-slate-300">Your cart is currently empty</h2>
              <p className="text-slate-500 text-sm mt-2 mb-6">Explore our fresh kitchen selection and add some dishes.</p>
              <button
                type="button"
                onClick={() => navigate("/menu")}
                className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Go to Menu
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Consolidated Unified Table Block */}
              <div className="bg-slate-950/40 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition hover:bg-white/[0.01]"
                  >
                    {/* Item Information details */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-white leading-tight">{item.name}</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Price per item: <span className="text-slate-300 font-mono font-medium">{formatCurrency(item.price)}</span>
                      </p>
                    </div>

                    {/* Quantity controls & actions */}
                    <div className="flex flex-wrap items-center gap-5 justify-between md:justify-end">
                      <div className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center justify-center font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-mono font-semibold text-sm text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-full bg-rose-500/10 border border-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-600 hover:text-white hover:border-transparent"
                      >
                        Remove
                      </button>

                      {/* Line Subtotal */}
                      <div className="min-w-[100px] text-right">
                        <span className="text-sm font-bold text-white font-mono">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary Footer */}
              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Grand Total
                  </p>
                  <h2 className="text-3xl font-black text-white mt-1 font-mono">
                    {formatCurrency(totalPrice)}
                  </h2>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate("/menu")}
                    className="flex-1 sm:flex-initial rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Continue Browsing
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="flex-1 sm:flex-initial rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition-all duration-300 hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}