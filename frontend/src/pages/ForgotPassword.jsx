import { useState } from "react";

import MainLayout from "../layouts/MainLayout";

import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {

      const data = await forgotPassword(email);
      setStatusMessage(data?.message || "Password reset email sent.");

    } catch (error) {
      
      setErrorMessage(error?.response?.data?.detail || error?.response?.data?.error || "Failed to send reset email.");
    }
  };

  return (

    <MainLayout>

      <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">
          Forgot Password
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >

          <input
            type="email"
            placeholder="Enter your email"
               className="w-full px-4 py-3 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatusMessage("");
              setErrorMessage("");
            }}
          />

          {statusMessage && (
            <p className="-mt-2 text-sm font-medium text-emerald-400">
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="-mt-2 text-sm font-medium text-rose-400">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
           className="
bg-gray-200
text-sm
font-semibold
text-slate-900
px-5
py-3
rounded-2xl
hover:bg-gray-300
transition-all
duration-300
shadow-lg
hover:scale-[1.02]
"
          >
            Send Reset Link
          </button>

        </form>

      </div>

    </MainLayout>
  );
}