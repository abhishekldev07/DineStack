import { Link } from "react-router-dom";

import useRole from "../hooks/useRole";

const socialLinks = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M13.5 9H15V6h-1.5C11.57 6 10 7.57 10 9.5V11H8v3h2v6h3v-6h2.1l.4-3H13V9.75c0-.41.34-.75.75-.75Z" />
      </svg>
    )
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm5 2.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm4.8-.95a1.05 1.05 0 1 1-1.05-1.05 1.05 1.05 0 0 1 1.05 1.05Z" />
      </svg>
    )
  },
  {
    label: "X",
    href: "https://x.com",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M18.9 3H22l-6.9 7.9L23 21h-6.6l-5.2-6.5L5.5 21H2.4l7.4-8.5L1 3h6.8l4.7 5.8L18.9 3Zm-1.2 16h1.7L7.2 4.9H5.4L17.7 19Z" />
      </svg>
    )
  }
];

export default function Footer() {
  const { isCustomer, isStaff, isAdmin, isLoggedIn } = useRole();

  const links = isCustomer
    ? [
        { label: "Menu", to: "/menu" },
        { label: "Cart", to: "/cart" },
        { label: "My Orders", to: "/my-orders" },
        { label: "Profile", to: "/dashboard" }
      ]
    : isStaff
      ? [
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Orders", to: "/staff/orders" },
          { label: "Menu Management", to: "/staff/menu" }
        ]
      : isAdmin
        ? [
            { label: "Dashboard", to: "/admin/dashboard" },
            { label: "Orders", to: "/admin/orders" },
            { label: "Menu Management", to: "/admin/menu" },
            { label: "Users", to: "/admin/users" }
          ]
        : [
            { label: "Login", to: "/login" },
            { label: "Register", to: "/register" },
            { label: "Menu", to: "/menu" }
          ];

  return (
    <footer className="mt-auto border-t border-slate-600 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
  <img
    src="/dinestack_logo.png"
    alt="DineStack Logo"
    className="h-10 w-10 object-contain"
  />

  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/45">
      DineStack
    </p>

    <p className="text-xs text-white/35">
      Smart Restaurant Platform
    </p>
  </div>
</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Crafted food ordering for modern restaurants.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
            Premium ordering, menu control, and staff operations in one streamlined experience.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
            Navigation
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-white/75">
            {links.map((item) => (
              <Link key={item.label} to={item.to} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
            Contact
          </h3>
          <div className="mt-4 space-y-3 text-sm text-white/75">
            <p>hello@dinestack.local</p>
            <p>+1 (555) 012-3456</p>
            <p>Open daily · 10:00 AM to 10:00 PM</p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white hover:text-slate-950"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} DineStack. All rights reserved.</p>
          <p>{isLoggedIn ? "Logged in experience enabled." : "Explore the menu and join us today."}</p>
        </div>
      </div>
    </footer>
  );
}