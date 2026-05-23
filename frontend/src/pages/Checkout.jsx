import React, { useContext, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { CartContext } from "../context/CartContext";
import { placeOrder } from "../services/orderService";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath } from "../utils/roleUtils";

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }
  return `Rs. ${numberValue.toFixed(0)}`;
};

export default function Checkout() {
  const { cartItems, totalPrice, clearCart } = useContext(CartContext) || {};
  const { role, isCustomer } = useRole() || {};
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deliveryAddressRef = useRef(null);

  const hasCoordinates = latitude !== null && longitude !== null;
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const normalizedPhoneNumber = phoneDigits.slice(0, 10);
  const trimmedDeliveryAddress = deliveryAddress.trim();

  const isPhoneValid = /^9[78]\d{8}$/.test(normalizedPhoneNumber);
  const addressIsRequired = !hasCoordinates;
  const isAddressProvided = trimmedDeliveryAddress.length > 0;
  const isAddressValid =
    !addressIsRequired ||
    (isAddressProvided &&
      trimmedDeliveryAddress.length >= 10 &&
      /^[\p{L}\d][\p{L}\d\s,.-]*$/u.test(trimmedDeliveryAddress) &&
      /[\p{L}]/u.test(trimmedDeliveryAddress) &&
      trimmedDeliveryAddress.replace(/[^\p{L}\d]/gu, "").length >= 3);

  const phoneError = !normalizedPhoneNumber
    ? "Phone number is required."
    : normalizedPhoneNumber.length !== 10
      ? "Phone number must be exactly 10 digits."
      : !/^9[78]/.test(normalizedPhoneNumber)
        ? "Phone number must start with 98 or 97."
        : "";

  const addressError = addressIsRequired && !trimmedDeliveryAddress
    ? "Delivery address is required unless you use GPS."
    : addressIsRequired && trimmedDeliveryAddress && !isAddressValid
      ? "Enter a meaningful delivery address with at least 10 characters."
      : "";

  const showPhoneError = phoneTouched || submitAttempted;
  const showAddressError = addressTouched || submitAttempted;
  const phoneMessage = showPhoneError ? phoneError : "";
  const addressMessage = showAddressError ? addressError : "";
  const hasValidationInteraction =
    phoneTouched || addressTouched || submitAttempted;

  const checkoutDisabled =
    !cartItems ||
    cartItems.length === 0 ||
    Boolean(isRequestingLocation) ||
    (hasValidationInteraction && (!isPhoneValid || !isAddressValid));

  const resizeDeliveryAddress = (element) => {
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    resizeDeliveryAddress(deliveryAddressRef.current);
  }, [deliveryAddress]);

  if (!isCustomer) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  const extractErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((entry) => entry?.msg || entry?.message || "Validation error")
        .join(" ");
    }

    return error?.response?.data?.error || "Checkout failed";
  };

  const handleUseCurrentLocation = () => {
    setLocationError("");
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationMessage("Live location will be used for this order.");
        setLocationError("");
        setIsRequestingLocation(false);
      },
      () => {
        setLatitude(null);
        setLongitude(null);
        setLocationMessage("");
        setLocationError(
          "Unable to access your location. Enter a delivery address instead."
        );
        setIsRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleCashOnDelivery = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      setSubmitAttempted(true);
      setSubmitError("");

      if (!isPhoneValid) {
        setSubmitError(phoneError || "Enter a valid Nepal phone number.");
        return;
      }

      if (!hasCoordinates && !isAddressValid) {
        setSubmitError(addressError || "Enter a valid delivery address.");
        return;
      }

      const orderItems = cartItems.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      }));

      const payload = {
        items: orderItems,
        phone_number: normalizedPhoneNumber,
        delivery_address: hasCoordinates ? trimmedDeliveryAddress || null : trimmedDeliveryAddress,
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null
      };

      const response = await placeOrder(payload);
      alert(`Order placed successfully! Order #${response.order_id}`);
      clearCart();
      navigate("/my-orders");
    } catch (error) {
      console.error(error);
      setSubmitError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnlinePayment = () => {
    alert("Online payment coming soon!");
    navigate("/cart");
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center text-slate-100">
          <h1 className="text-3xl font-black mb-4">Your cart is empty</h1>
          <p className="text-slate-400 text-sm mb-6">You must add items to your cart before checking out.</p>
          <button
            onClick={() => navigate("/menu")}
            className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-slate-150"
          >
            Browse Menu
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 text-slate-100">
        
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          {/* Header row */}
          <div className="pb-6 border-b border-white/5 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Checkout</h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
              Select your payment method and confirm your order
            </p>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 sm:p-6 shadow-inner">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                    Phone Number
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={normalizedPhoneNumber}
                    onChange={(event) => {
                      setPhoneTouched(true);
                      const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneNumber(digitsOnly);
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="Enter your phone number"
                    className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      phoneMessage
                        ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30"
                        : "border-slate-700 focus:border-slate-500 focus:ring-slate-600"
                    }`}
                  />
                  {phoneMessage && (
                    <p className="text-xs font-medium text-rose-300 transition-all duration-200">
                      {phoneMessage}
                    </p>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                    Delivery Address
                  </span>
                  <textarea
                    value={deliveryAddress}
                    ref={deliveryAddressRef}
                    onChange={(event) => {
                      setAddressTouched(true);
                      setDeliveryAddress(event.target.value);
                      resizeDeliveryAddress(event.target);
                    }}
                    onBlur={() => setAddressTouched(true)}
                    onInput={(event) => resizeDeliveryAddress(event.target)}
                    placeholder="Enter manual delivery address or leave blank if using current location"
                    rows={3}
                    className={`w-full overflow-hidden rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      addressMessage
                        ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30"
                        : "border-slate-700 focus:border-slate-500 focus:ring-slate-600"
                    }`}
                  />
                  {addressMessage && (
                    <p className="text-xs font-medium text-rose-300 transition-all duration-200">
                      {addressMessage}
                    </p>
                  )}
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isRequestingLocation}
                  className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRequestingLocation ? "Fetching location..." : "Use Current Location"}
                </button>

                <div className="text-xs text-slate-400 sm:text-right">
                  {hasCoordinates ? (
                    <p className="font-semibold text-emerald-300">
                      Live location enabled: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </p>
                  ) : (
                    <p>Manual address is required until GPS is enabled.</p>
                  )}
                </div>
              </div>

              {locationMessage && (
                <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  {locationMessage}
                </p>
              )}

              {locationError && (
                <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                  {locationError}
                </p>
              )}

              {submitError && (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
                  {submitError}
                </p>
              )}
            </div>

            {/* Consolidated item list block matching Cart style */}
            <div className="bg-slate-950/40 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition hover:bg-white/[0.01]"
                >
                  {/* Item Details */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-white leading-tight">{item.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Quantity: <span className="text-slate-200 font-semibold">{item.quantity}</span>
                      <span className="mx-2 text-slate-700">•</span>
                      Rate: <span className="text-slate-300 font-mono font-medium">{formatCurrency(item.price)}</span>
                    </p>
                  </div>

                  {/* Line Subtotal */}
                  <div className="min-w-[120px] text-right">
                    <span className="text-base font-bold text-white font-mono">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total summary and workflow action triggers */}
            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Order Total
                </p>
                <h2 className="text-3xl font-black text-white mt-1 font-mono">
                  {formatCurrency(totalPrice)}
                </h2>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCashOnDelivery}
                  disabled={checkoutDisabled || isSubmitting}
                  className="flex-1 sm:flex-initial rounded-full bg-white px-6 py-3 text-xs font-bold text-slate-950 transition-all duration-300 hover:bg-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:shadow-none disabled:hover:bg-slate-600"
                >
                  {isSubmitting ? "Placing Order..." : "Cash on Delivery"}
                </button>
                
                <button
                  type="button"
                  onClick={handleOnlinePayment}
                  className="flex-1 sm:flex-initial rounded-full bg-blue-500/10 border border-blue-500/20 px-6 py-3 text-xs font-bold text-blue-400 transition hover:bg-blue-600 hover:text-white hover:border-transparent"
                >
                  Pay Online
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}