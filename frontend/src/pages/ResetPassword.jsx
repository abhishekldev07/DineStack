import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import { resetPassword } from "../services/authService";

const isValidPassword = (value) => value.length >= 6 && value.length <= 50;

export default function ResetPassword() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [authError, setAuthError] = useState("");

  const passwordError = (passwordTouched || submitAttempted) && !isValidPassword(password)
    ? "Password is invalid. Use 6 to 50 characters."
    : "";

  const confirmError = (confirmTouched || submitAttempted) && confirmPassword && confirmPassword !== password
    ? "Passwords do not match."
    : "";

  useEffect(() => {
    if (!isSuccess) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [isSuccess, navigate]);

  const handleSubmit = async (e) => {

    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError("");

    if (!isValidPassword(password) || confirmPassword !== password) {
      return;
    }

    try {

      await resetPassword(token, password);
      setIsSuccess(true);

    } catch (error) {
      
      setAuthError(error?.response?.data?.detail || error?.response?.data?.error || "Password reset failed.");
    }
  };

  return (

    <MainLayout>

      <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">
          Reset Password
        </h1>

        {isSuccess ? (
          <p className="text-sm text-gray-300">
            Your password has been reset successfully. Redirecting to login...
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                className={`w-full px-4 py-3 pr-12 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 ${passwordError ? "border-rose-500/60 focus:ring-rose-500/30" : "border-white/10"}`}
                value={password}
                onChange={(e) => {
                  setPasswordTouched(true);
                  setPassword(e.target.value);
                  setAuthError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 inline-flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {passwordError && (
              <p className="-mt-2 text-sm font-medium text-rose-400">
                {passwordError}
              </p>
            )}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className={`w-full px-4 py-3 pr-12 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 ${confirmError ? "border-rose-500/60 focus:ring-rose-500/30" : "border-white/10"}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmTouched(true);
                  setConfirmPassword(e.target.value);
                  setAuthError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 inline-flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {confirmError && (
              <p className="-mt-2 text-sm font-medium text-rose-400">
                {confirmError}
              </p>
            )}

            {authError && (
              <p className="-mt-2 text-sm font-medium text-rose-400">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black text-slate-950 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] active:scale-[0.98]"
            >
              Reset Password
            </button>

          </form>
        )}

      </div>

    </MainLayout>
  );
}