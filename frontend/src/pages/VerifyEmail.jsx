import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { resendVerification, verifyEmail } from "../services/authService";

function decodeTokenEmail(token) {
  try {
    const payloadPart = token.split(".")[1] || "";
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded));
    return decoded?.email || "";
  } catch (error) {
    return "";
  }
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationChecking, setVerificationChecking] = useState(false);

  const email = useMemo(() => decodeTokenEmail(token), [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setIsSuccess(false);
      setErrorMessage("Verification link is invalid or expired");
      return;
    }

    let mounted = true;

    const verify = async () => {
      try {
        const data = await verifyEmail(token);

        if (mounted) {
          setIsSuccess(true);
          setMessage(data?.message || "Email verified successfully");
          setErrorMessage("");
        }
      } catch (error) {
        if (mounted) {
          setIsSuccess(false);
          setErrorMessage(error?.response?.data?.detail || error?.response?.data?.error || "Verification link is invalid or expired");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [token]);

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
    if (!token) {
      return undefined;
    }

    let mounted = true;

    const recheck = async () => {
      try {
        setVerificationChecking(true);
        const data = await verifyEmail(token);

        if (mounted) {
          setIsSuccess(true);
          setMessage(data?.message || "Email verified successfully");
          setErrorMessage("");
          setLoading(false);
        }
      } catch (error) {
        if (mounted && !isSuccess) {
          setErrorMessage(error?.response?.data?.detail || error?.response?.data?.error || "Verification link is invalid or expired");
          setLoading(false);
        }
      } finally {
        if (mounted) {
          setVerificationChecking(false);
        }
      }
    };

    const interval = window.setInterval(recheck, 5000);
    const handleFocus = () => recheck();
    const handleVisibility = () => {
      if (!document.hidden) {
        recheck();
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
  }, [token, isSuccess]);

  useEffect(() => {
    if (!isSuccess) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [isSuccess, navigate]);

  const handleResend = async () => {
    if (!email) {
      setErrorMessage("Unable to resend verification without a valid email address.");
      return;
    }

    try {
      setResendLoading(true);
      setErrorMessage("");

      const data = await resendVerification(email);
      setMessage(data?.message || "Verification email sent. Please check your inbox.");
      setResendCooldown(30);
    } catch (error) {
      setErrorMessage(error?.response?.data?.detail || error?.response?.data?.error || "Unable to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">
          Verify Email
        </h1>

        {loading ? (
          <p className="text-sm text-gray-300">
            Verifying your email...
          </p>
        ) : isSuccess ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-300">
              {message}
            </p>

            {verificationChecking && (
              <p className="text-xs text-slate-400">
                Rechecking verification status...
              </p>
            )}

            <p className="text-xs text-slate-400">
              Redirecting...
            </p>

            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="glow-btn"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-rose-400">
              {errorMessage}
            </p>

            {message && (
              <p className="text-sm text-emerald-400">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0 || !email}
              className="glow-btn disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendLoading
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend Verification (${resendCooldown}s)`
                  : "Resend Verification"}
            </button>

            <Link
              to="/login"
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
