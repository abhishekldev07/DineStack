import { NavLink } from "react-router-dom";

import { useContext } from "react";

import { AuthContext } from "../../context/AuthContext";
import useRole from "../../hooks/useRole";

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const { isAdmin, isStaff } = useRole();

  const navItems = isAdmin
    ? [
        { label: "Dashboard", to: "/admin/dashboard" },
        { label: "Profile", to: "/profile" },
        { label: "Orders", to: "/admin/orders" },
        { label: "Reservations", to: "/admin/reservations" },
        { label: "Menu Management", to: "/admin/menu" },
        { label: "Users", to: "/admin/users" }
      ]
    : isStaff
      ? [
          { label: "Profile", to: "/profile" },
          { label: "Staff Orders", to: "/staff/orders" },
          { label: "Reservations", to: "/staff/reservations" },
          { label: "Menu Management", to: "/staff/menu" }
        ]
      : [{ label: "Dashboard", to: "/admin/dashboard" }];

  return (
    <aside className="flex h-auto w-full flex-col border-r border-slate-200 bg-slate-950 px-5 py-6 text-white shadow-[10px_0_40px_rgba(15,23,42,0.14)] md:sticky md:top-0 md:h-screen md:w-64 lg:max-w-[300px]">
      <div className="mb-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
          DineStack
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">
          Admin Panel
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Restaurant analytics, operations, menu control, and customer management in one place.
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/admin/dashboard"}
            className={({ isActive }) =>
              [
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "bg-white text-slate-950 shadow-lg"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              ].join(" ")
            }
          >
            <span>{item.label}</span>
            <span className="text-xs uppercase tracking-[0.22em] opacity-70">
              {item.label === "Payments" ? "Ops" : "Nav"}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-white/65">
        Use the sidebar to switch between sections without losing context.
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
      >
        Logout
      </button>
    </aside>
  );
}