import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { changePassword } from "../services/authService";

const isValidPassword = (value) => value.length >= 6 && value.length <= 50;

export default function ChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentTouched, setCurrentTouched] = useState(false);
  const [newTouched, setNewTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [authError, setAuthError] = useState("");

  const currentError = (currentTouched || submitAttempted) && currentPassword.trim().length === 0
    ? "Current password is required."
    : "";

  const newPasswordError = (newTouched || submitAttempted) && !isValidPassword(newPassword)
    ? "Password is invalid. Use 6 to 50 characters."
    : "";

  const confirmError = (confirmTouched || submitAttempted) && confirmPassword !== newPassword
    ? "Passwords do not match."
    : "";

  useEffect(() => {
    if (!isSuccess) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate("/profile", { replace: true });
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [isSuccess, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError("");

    if (currentPassword.trim().length === 0 || !isValidPassword(newPassword) || confirmPassword !== newPassword) {
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setIsSuccess(true);
    } catch (error) {
      
      setAuthError(error?.response?.data?.detail || error?.response?.data?.error || "Unable to change password.");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">
          Change Password
        </h1>

        {isSuccess ? (
          <p className="text-sm text-gray-300">
            Your password has been changed successfully. Redirecting to profile...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Current Password"
              className={`w-full px-4 py-3 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 ${currentError ? "border-rose-500/60 focus:ring-rose-500/30" : "border-white/10"}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentTouched(true);
                setCurrentPassword(e.target.value);
                setAuthError("");
              }}
            />
            {currentError && <p className="-mt-2 text-sm font-medium text-rose-400">{currentError}</p>}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                className={`w-full px-4 py-3 pr-12 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 ${newPasswordError ? "border-rose-500/60 focus:ring-rose-500/30" : "border-white/10"}`}
                value={newPassword}
                onChange={(e) => {
                  setNewTouched(true);
                  setNewPassword(e.target.value);
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
            {newPasswordError && <p className="-mt-2 text-sm font-medium text-rose-400">{newPasswordError}</p>}

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
            {confirmError && <p className="-mt-2 text-sm font-medium text-rose-400">{confirmError}</p>}

            {authError && <p className="-mt-2 text-sm font-medium text-rose-400">{authError}</p>}

            <button type="submit" className="glow-btn">
              Change Password
            </button>
          </form>
        )}
      </div>
    </MainLayout>
  );
}