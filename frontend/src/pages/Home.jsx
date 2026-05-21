import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { CartContext } from "../context/CartContext";
import useRole from "../hooks/useRole";
import { getMenuItems } from "../services/menuService";
import { resolveMenuImageUrl } from "../utils/imageUrl";


const formatCurrency = (value) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "Rs. 0";
  }

  return `Rs. ${numberValue.toFixed(0)}`;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isLoggedIn, isCustomer, isStaff, isAdmin } = useRole();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");


  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getMenuItems();

        if (mounted) {
          setMenuItems(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load menu items", error);

        if (mounted) {
          setMenuItems([]);
          setErrorMessage("Unable to load menu items right now.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const categories = new Set();

    menuItems.forEach((item) => {
      if (item?.category) {
        categories.add(item.category);
      }
    });

    return ["all", ...Array.from(categories)];
  }, [menuItems]);

  const latestItems = useMemo(() => {
    return [...menuItems]
      .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
      .slice(0, 6);
  }, [menuItems]);

  const balancedFeatured = useMemo(() => {
    // Build a candidate list ordered by popularity then recency
    const candidates = [...menuItems].sort((left, right) => {
      const leftScore = Number(left.orders_count ?? left.sold ?? 0);
      const rightScore = Number(right.orders_count ?? right.sold ?? 0);

      if (rightScore !== leftScore) return rightScore - leftScore;
      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });

    const interleaveByCategory = (items, limit = 6) => {
      const groups = {};
      items.forEach((it) => {
        const cat = it?.category || "uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(it);
      });

      // Order categories deterministically by group size (larger first)
      const cats = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

      const result = [];
      let idx = 0;
      while (result.length < limit) {
        let added = false;
        for (const c of cats) {
          if (groups[c][idx]) {
            result.push(groups[c][idx]);
            if (result.length >= limit) break;
            added = true;
          }
        }
        if (!added) break;
        idx++;
      }

      return result;
    };

    return interleaveByCategory(candidates, 6);
  }, [menuItems]);

  const heroActions = isLoggedIn
    ? isCustomer
      ? [
          { label: "Profile", to: "/profile", style: "solid" },
          { label: "My Orders", to: "/my-orders", style: "outline" },
          { label: "Cart", to: "/cart", style: "outline" }
        ]
      : isStaff
        ? [
            { label: "Orders", to: "/staff/orders", style: "solid" },
            { label: "Menu Management", to: "/staff/menu", style: "outline" },
            { label: "Reservations", to: "/staff/reservations", style: "outline" }
          ]
        : [
            { label: "Dashboard", to: "/admin/dashboard", style: "solid" },
            { label: "Menu Management", to: "/admin/menu", style: "outline" },
            { label: "Reservations", to: "/admin/reservations", style: "outline" }
          ]
    : [
        { label: "Browse Menu", to: "/menu", style: "solid" },
        { label: "Create Account", to: "/register", style: "outline" },
        { label: "Login", to: "/login", style: "outline" }
      ];

  const testimonials = [
    { id: 1, name: "Alex", text: "The food arrives fresh, and the ordering flow is clean." },
    { id: 2, name: "Priya", text: "Fast service, polished menu pages, and easy reordering." },
    { id: 3, name: "Sam", text: "Staff gets the right tools without cluttering the customer experience." }
  ];

  const offers = [
    { id: 1, title: "Free delivery over Rs. 1500", detail: "Enjoy complimentary delivery on qualifying orders." },
    { id: 2, title: "Lunch combo savings", detail: "Bundle a main and drink for a lower price during lunch hours." },
    { id: 3, title: "Weekend featured dishes", detail: "Special chef picks rotate every Friday through Sunday." }
  ];

  const renderFoodCard = (item) => {
    const isAvailable = item?.available !== false;

    return (
      
      <article
        key={item.id}
        className="premium-card group overflow-hidden transition"
      >
        
        <button
          type="button"
          onClick={() => {
            if (isCustomer) {
              navigate("/menu");
            }
          }}
          className="block w-full text-left"
        >
          <div className="relative h-56 bg-slate-100">
            <img
              src={resolveMenuImageUrl(item.image_url) || fallbackImage}
              alt={item.name || "Menu item"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.src = fallbackImage;
              }}
            />

            <div className="absolute left-4 top-4 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {item.category || "Uncategorized"}
            </div>

            <div
              className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white ${
                isAvailable ? "bg-emerald-500" : "bg-rose-600"
              }`}
            >
              {isAvailable ? "In Stock" : "Out of Stock"}
            </div>
          </div>
        </button>

        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white line-clamp-1 group-hover:text-amber-200 transition-colors">
                            {item.name || "Untitled item"}
                          </h2>
              <p className="mt-1 text-sm text-white/60">
                {item.category || "Uncategorized"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-black text-white">{formatCurrency(item.price)}</p>
              <p className="text-xs text-white/60">per item</p>
            </div>
          </div>

          <p className="min-h-14 text-sm leading-6 text-slate-400">
            {item.description || "No description available."}
          </p>

         <div className="mt-5 flex items-center justify-between gap-3">
  
  {/* Elegant Dot Status Indicator (Non-clickable state) */}
  <div className="flex items-center gap-2 select-none">
    {isAvailable ? (
      <>
        {/* Soft, active pulsing green status dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold text-emerald-400/95">Ready to order</span>
      </>
    ) : (
      <>
        {/* Static muted status dot */}
        <span className="h-2 w-2 rounded-full bg-rose-500/80"></span>
        <span className="text-xs font-semibold text-slate-500">Unavailable</span>
      </>
    )}
  </div>

  {/* Contextual Interactive Actions */}
  {isCustomer ? (
    <button
      type="button"
      onClick={() => {
        if (!isAvailable) return;
        addToCart(item);
        navigate("/cart");
      }}
      disabled={!isAvailable}
      className="rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-950 transition-all duration-300 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
    >
      Add to Cart
    </button>
  ) : isLoggedIn ? (
    <button
      type="button"
      onClick={() => navigate("/menu")}
      className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20"
    >
      View Menu
    </button>
  ) : (
    <button
      type="button"
      onClick={() => navigate("/login")}
      className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20"
    >
      Login to Order
    </button>
  )}
  
</div>
        </div>
      </article>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-1 py-4 sm:px-6 lg:px-8">
      <section className="premium-hero relative overflow-hidden rounded-[2rem] px-4 py-8 text-white sm:px-10 lg:px-12 lg:py-14">
  {/* Aurora Background */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#020617_0%,#071226_100%)]" />
    <div className="aurora aurora-orange-1" />
    <div className="aurora aurora-orange-2" />
    <div className="aurora aurora-blue-1" />
    <div className="aurora aurora-blue-2" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_35%)]" />
    <div className="aurora aurora-center-glow" />
    <div className="grain absolute inset-0 opacity-[0.035]" />
  </div>

  {/* FIXED: Using clean responsive gap spacing instead of forcing huge paddings */}
  <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
    
    <div
      className="relative z-20 opacity-90 animate-[fadeInUp_550ms_ease-out_forwards]"
      style={{ animationDelay: "0ms" }}
    >
      {/* FIXED: Changed pb-44 to pb-6 for mobile mobile views */}
      <div className="relative z-20 max-w-3xl pb-6 sm:pb-8 lg:pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.34em] text-white/55">
          DineStack Restaurant
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
          Restaurant-grade ordering with premium menu experiences.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg"> 
          Explore fresh dishes, discover featured offers, and move directly into the right flow for your role.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {heroActions.map((action, idx) => (
            <Link
              key={action.label}
              to={action.to}
              className={[
                "rounded-2xl px-5 py-3 text-sm font-semibold transition",
                "ring-1 ring-white/10",
                action.style === "solid"
                  ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%),linear-gradient(90deg,rgba(251,191,36,0.95),rgba(249,115,22,0.95))] text-slate-950 hover:brightness-105"
                  : "bg-white/10 text-white backdrop-blur hover:bg-white/15"
              ].join(" ")}
              style={{ animationDelay: `${idx * 90}ms` }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>

          <div
            className="
              relative
              w-full
              overflow-hidden
              rounded-[2rem]
              border
              border-white/10
              bg-white/10
              px-3
              py-5
              backdrop-blur-xl
              sm:px-6
              md:px-7
            "
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/55 sm:text-sm">
                  Featured now
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
                  Popular picks
                </h2>
              </div>
              <Link
                to="/menu"
                className="shrink-0 text-sm font-semibold text-amber-200 transition hover:text-white"
              >
                View all
              </Link>
            </div>

  <div className="mt-5 space-y-3">
    {loading ? (
      Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl bg-white/10"
        />
      ))
    ) : balancedFeatured.length > 0 ? (
      balancedFeatured.slice(0, 3).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() =>
            navigate(`/menu?item=${encodeURIComponent(String(item.id))}`)
          }
          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-2xl
            bg-white/8
            p-3
            text-left
            transition
            hover:bg-white/10

            sm:gap-4
            sm:p-4
          "
        >
          <img
            src={resolveMenuImageUrl(item.image_url) || fallbackImage}
            alt={item.name || "Menu item"}
            className="
              h-16
              w-16
              shrink-0
              rounded-2xl
              object-cover
              ring-1
              ring-white/10

              sm:h-20
              sm:w-20
            "
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />

          <div className="min-w-0 flex-1 overflow-hidden">
            <p
              className="
                text-sm
                font-bold
                leading-tight
                text-white

                sm:text-lg
              "
            >
              {item.name}
            </p>

            <p className="mt-1 text-xs text-white/60 sm:text-sm">
              {item.category || "Uncategorized"}
            </p>
          </div>

          <div
            className="
              shrink-0
              text-sm
              font-black
              text-white

              sm:text-lg
            "
          >
            {formatCurrency(item.price)}
          </div>
        </button>
      ))
    ) : (
      <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/70">
        No featured items are available yet.
      </div>
    )}
  </div>
</div>
          </div>
        </section>


        {errorMessage ? (
          <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_16px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">
                Categories
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Browse by category</h2>
            </div>

            <Link to="/menu" className="text-sm font-semibold text-white/70 hover:text-white transition">
              Open the full menu
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  if (category === "all") {
                    navigate("/menu");
                    return;
                  }

                  navigate(`/menu?category=${encodeURIComponent(category)}`);
                }}
                className="group select-none rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span className="inline-flex items-center gap-2">
                  {category === "all"
                    ? "All"
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className="hidden group-hover:inline text-amber-200">→</span>
                </span>
              </button>
            ))}
          </div>
        </section>


        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Popular Items
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-250">Customer favorites</h2>
            </div>

            <Link to="/menu" className="text-sm font-semibold text-slate-400 hover:text-slate-300">
              See all menu items
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[28rem] animate-pulse rounded-[1.75rem] bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {balancedFeatured.map((item) => renderFoodCard(item))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Latest Items
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-250">Freshly added dishes</h2>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[28rem] animate-pulse rounded-[1.75rem] bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {latestItems.map((item) => renderFoodCard(item))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_16px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">
              Offers
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Current promotions</h2>

            <div className="mt-6 grid gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="relative overflow-hidden rounded-[1.5rem] bg-black/20 p-5 ring-1 ring-white/10 transition hover:bg-black/30"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.22),_transparent_40%)]" />
                  <div className="relative">
                    <h3 className="text-lg font-bold text-white">{offer.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{offer.detail}</p>
                  </div>
                </div>
              ))}               
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_16px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">
              Restaurant Info
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">About DineStack Kitchen</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              We serve carefully prepared meals with fresh ingredients, fast delivery, and a polished ordering experience for customers, staff, and admin teams.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-black/20 p-5 ring-1 ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Hours
                </p>
                <p className="mt-2 font-semibold text-white">10:00 AM - 10:00 PM</p>
              </div>

              <div className="rounded-[1.5rem] bg-black/20 p-5 ring-1 ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Location
                </p>
                <p className="mt-2 font-semibold text-white">Downtown restaurant district</p>
              </div>
            </div>
          </div>
        </section>


        <section className="mt-10 rounded-[2rem] border border-slate-700 bg-white/5 p-6 shadow-[0_16px_55px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-350">What guests say</h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.id} className="rounded-[1.5rem] bg-black/30 p-5 ring-1 ring-white/10">
                <p className="text-sm leading-7 text-slate-300">“{testimonial.text}”</p>
                <footer className="mt-4 text-sm font-semibold text-slate-250">— {testimonial.name}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_18px_60px_rgba(15,23,42,0.24)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-white/45">
                CTA
              </p>
              <h2 className="mt-2 text-3xl font-black">Ready to order something great?</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {isLoggedIn ? (
                <>
                  {isCustomer ? (
                    <>
                      <Link to="/profile" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                        Profile
                      </Link>
                      <Link to="/my-orders" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        My Orders
                      </Link>
                    </>
                  ) : isStaff ? (
                    <>
                      <Link to="/staff/orders" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                        Orders
                      </Link>
                      <Link to="/staff/menu" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        Menu Management
                      </Link>
                      <Link to="/staff/reservations" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        Reservations
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/admin/dashboard" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                        Dashboard
                      </Link>
                      <Link to="/admin/menu" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        Menu Management
                      </Link>
                      <Link to="/admin/reservations" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                        Reservations
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/menu" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                    Browse Menu
                  </Link>
                  <Link to="/login" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
