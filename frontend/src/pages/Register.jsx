import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import { getVerificationStatus, registerUser, resendVerification } from "../services/authService";

const isValidPassword = (value) => value.length >= 6 && value.length <= 50;

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationChecking, setVerificationChecking] = useState(false);

  const passwordError = (passwordTouched || submitAttempted) && !isValidPassword(password)
    ? "Password is invalid. Use 6 to 50 characters."
    : "";

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!isSuccess || !email) {
      return undefined;
    }

    let mounted = true;

    const checkStatus = async () => {
      try {
        setVerificationChecking(true);
        const data = await getVerificationStatus(email);

        if (mounted && data?.is_verified) {
          navigate("/login", { replace: true });
        }
      } catch (error) {
        
      } finally {
        if (mounted) {
          setVerificationChecking(false);
        }
      }
    };

    checkStatus();

    const interval = window.setInterval(checkStatus, 5000);
    const handleFocus = () => checkStatus();
    const handleVisibility = () => {
      if (!document.hidden) {
        checkStatus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [email, isSuccess, navigate]);

  const handleRegister = async (e) => {

    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError("");
    setStatusMessage("");

    if (!isValidPassword(password)) {
      return;
    }

    try {

      const data = await registerUser({
        username,
        email,
        password
      });

      setIsSuccess(true);
      setStatusMessage(data?.message || "Verification email sent. Please verify your email before logging in.");

    } catch (error) {
      setAuthError(error?.response?.data?.detail || error?.response?.data?.error || "Registration failed.");
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      setAuthError("");

      const data = await resendVerification(email);
      setStatusMessage(data?.message || "Verification email sent. Please check your inbox.");
      setResendCooldown(30);
    } catch (error) {
      setAuthError(error?.response?.data?.detail || error?.response?.data?.error || "Unable to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (

    <MainLayout>

       <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">
          Register
        </h1>

        {isSuccess ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-slate-300">
              {statusMessage || "Verification email sent. Please verify your email before logging in."}
            </p>

            {verificationChecking && (
              <p className="text-xs text-slate-400">
                Checking verification status...
              </p>
            )}

            {authError && (
              <p className="text-sm font-medium text-rose-400">
                {authError}
              </p>
            )}

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading || resendCooldown > 0}
              className="glow-btn disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendLoading
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend Verification Email (${resendCooldown}s)`
                  : "Resend Verification Email"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-4"
          >

          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-3 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full px-4 py-3 pr-12 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20 ${passwordError ? "border-rose-500/60 focus:ring-rose-500/30" : "border-white/10"}`}
              value={password}
              onChange={(e) => {
                setPasswordTouched(true);
                setPassword(e.target.value);
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

          {authError && (
            <p className="-mt-2 text-sm font-medium text-rose-400">
              {authError}
            </p>
          )}

          <button
            type="submit"
             className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black text-slate-950 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] active:scale-[0.98]"
          >
            Register
          </button>

          </form>
        )}

      </div>

    </MainLayout>
  );
}   