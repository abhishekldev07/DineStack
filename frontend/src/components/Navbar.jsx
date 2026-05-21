import { useContext, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import useRole from "../hooks/useRole";
import { isAdminRole, isStaffRole } from "../utils/roleUtils";

function NavLink({
  to,
  label,
  isActive,
  onClick
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        "group relative rounded-xl px-3 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
        isActive
          ? "text-white"
          : "text-white/80 hover:text-white",
        isActive
          ? "bg-white/10"
          : "hover:bg-white/5",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="relative z-10">{label}</span>
      <span
        className={[
          "pointer-events-none absolute inset-0 -z-0 rounded-xl",
          isActive ? "opacity-100" : "opacity-0",
          "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_55%)]",
          "transition-opacity duration-300",
        ].join(" ")}
      />
    </Link>
  );
}

export default function Navbar() {
  const { token, logout, isHydrating } = useContext(AuthContext);
  const { role } = useRole();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isCustomer = role === "customer";
  const isStaff = isStaffRole(role);
  const isAdmin = isAdminRole(role);

  const links = useMemo(() => {
    // While hydrating, avoid exposing role-specific links
    if (isHydrating) {
      return [{ to: "/", label: "Home" }];
    }
    if (isStaff) {
      return [
        { to: "/", label: "Home" },
        { to: "/staff/menu", label: "Menu Management" },
        { to: "/staff/orders", label: "Orders" },
        { to: "/staff/reservations", label: "Reservations" },
        // { to: "/profile", label: "Profile" }
      ];
    }

    if (isAdmin) {
      return [
        { to: "/", label: "Home" },
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/menu", label: "Menu Management" },
        { to: "/admin/orders", label: "Orders" },
        { to: "/admin/reservations", label: "Reservations" },
        { to: "/admin/users", label: "Users" },
        // { to: "/profile", label: "Profile" }
      ];
    }

    const base = [{ to: "/", label: "Home" }];

    // show public Menu link for customers and guests (not staff/admin)
    if (!isStaff && !isAdmin) {
      base.push({ to: "/menu", label: "Menu" });
    }

    if (isCustomer) {
      base.push({ to: "/cart", label: "Cart" });
      base.push({ to: "/my-orders", label: "My Orders" });
      base.push({ to: "/reservations", label: "Reservations" });
      // base.push({ to: "/profile", label: "Profile" });
    }

    return base;
  }, [isAdmin, isCustomer, isStaff, isHydrating]);

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <nav
      className={[
        "navbar",
        "sticky top-0 z-50",
        "border-b border-white/10",
        "bg-black/55 backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="group inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 transition group-hover:bg-white/15">
  <img
    src="/dinestack_logo.png"
    alt="DineStack Logo"
    className="h-9 w-9 object-contain"
  />
</span>
            <span className="hidden sm:block">
              <span className="text-lg font-black tracking-tight text-white">DineStack</span>
              <span className="ml-2 hidden lg:inline text-xs font-semibold text-amber-200/80">Premium Delivery</span>
            </span>
          </Link>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          <div className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} label={l.label} isActive={isActive(l.to)} />
            ))}
          </div>

          <div className="ml-4 flex items-center gap-2">
            {token ? (
              <div className="relative">
                {isHydrating ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
                    <span className="animate-pulse">Loading…</span>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                      aria-expanded={profileOpen}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_55%)] text-white/90">
                        {role?.[0]?.toUpperCase() || "U"}
                      </span>
                      <span className="hidden md:inline">Account</span>
                      <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    <div
                      className={[
                        "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl",
                        "shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
                        "transition-all",
                        profileOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-95 pointer-events-none",
                      ].join(" ")}
                    >
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Role</p>
                        <p className="mt-1 text-sm font-bold text-white capitalize">{role || "user"}</p>
                      </div>
                      <div className="border-t border-white/10" />
                      <div className="p-2">
                        <Link
                          to="/profile"
                          onClick={() => {
                            setProfileOpen(false);
                          }}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                        >
                          <span>Profile</span>
                          <span className="text-amber-200">→</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                          }}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/90 transition hover:bg-white/10"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="glow-btn"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 lg:hidden">
          {token ? (
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-2xl bg-white/10 p-2 ring-1 ring-white/15 text-white transition hover:bg-white/15"
              aria-expanded={profileOpen}
              aria-label="Account menu"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_55%)] text-sm font-black">
                {role?.[0]?.toUpperCase() || "U"}
              </span>
            </button>
          ) : (
            <Link
              to="/login"
              className="glow-btn"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-white/10 p-2 ring-1 ring-white/15 text-white transition hover:bg-white/15"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Open navigation menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-nav"
        className={[
          "lg:hidden",
          "overflow-hidden",
          "border-t border-white/10",
          "bg-black/65 backdrop-blur-xl",
          "transition-all duration-300",
          mobileOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="grid gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                label={l.label}
                isActive={isActive(l.to)}
                onClick={() => setMobileOpen(false)}
              />
            ))}

            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-2">
              {token ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="glow-btn w-full text-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

