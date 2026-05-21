import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { loginUser } from "../services/authService";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const isValidPassword = (value) => value.length >= 6 && value.length <= 50;

export default function Login() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [authError, setAuthError] = useState("");

  const { login } = useContext(AuthContext);

  const passwordError = (passwordTouched || submitAttempted) && !isValidPassword(password)
    ? "Password is invalid. Use 6 to 50 characters."
    : "";

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);
  

  const handleLogin = async (e) => {

    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError("");

    if (!isValidPassword(password)) {
      return;
    }

    try {

      const data = await loginUser({
        email,
        password
      });

      login(data);
      navigate("/", { replace: true });

    } catch (error) {
      
      setAuthError(error?.response?.data?.detail || error?.response?.data?.error || "Invalid email or password.");
    }
  };

  return (

    <MainLayout>

      <div className="max-w-md mx-auto bg-slate-950/40 p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">
          Login
        </h1>

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4"
        >

          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 border rounded-2xl bg-slate-800 focus:outline-none focus:ring-2 focus:ring-black/20"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAuthError("");
            }}
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

          {authError && (
            <p className="-mt-2 text-sm font-medium text-rose-400">
              {authError}
            </p>
          )}

          <button
            type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black text-slate-950 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] active:scale-[0.98]"
          >
            Login
          </button>

        </form>
        <p className="mt-4 text-sm">

  <Link
    to="/forgot-password"
    className="text-gray-200"
  >
    Forgot Password?
  </Link>

</p>

      </div>

    </MainLayout>
  );
}