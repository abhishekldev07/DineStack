import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import useRole from "../hooks/useRole";
import { getMyProfile } from "../services/profileService";
import { getMyReservations } from "../services/reservationService";
import ProfileCard from "./ProfileCard";

export default function ProfilePage() {
  const { role, isCustomer, isStaff, isAdmin } = useRole();
  const [profile, setProfile] = useState(null);
  const [reservationCount, setReservationCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        if (mounted) {
          setProfile(data);
          // If customer, also fetch reservations count
          if ((data?.role || "").toLowerCase() === "customer") {
            try {
              const res = await getMyReservations();

              let count = 0;

              if (Array.isArray(res)) {
                count = res.length;
              } else if (res && Array.isArray(res.reservations)) {
                count = res.reservations.length;
              } else if (res && typeof res.total === "number") {
                count = res.total;
              }

              if (mounted) setReservationCount(count);
            } catch (err) {
              console.error("Failed to load reservations", err);
            }
          }
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const actions = isCustomer
    ? [
        { label: "Browse Menu", to: "/menu", variant: "solid" },
        { label: "My Orders", to: "/my-orders", variant: "outline" },
        { label: "Change Password", to: "/change-password", variant: "outline" }
      ]
    : isStaff
      ? [
          { label: "Staff Orders", to: "/staff/orders", variant: "solid" },
          { label: "Menu Management", to: "/staff/menu", variant: "outline" },
          { label: "Change Password", to: "/change-password", variant: "outline" }
        ]
      : isAdmin
        ? [
            { label: "Dashboard", to: "/admin/dashboard", variant: "solid" },
            { label: "Orders", to: "/admin/orders", variant: "outline" },
            { label: "Users", to: "/admin/users", variant: "outline" },
            { label: "Change Password", to: "/change-password", variant: "outline" }
          ]
        : [];

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <ProfileCard
          profile={profile || { role }}
          showOrderCount={isCustomer}
          showReservationCount={isCustomer}
          reservationCount={reservationCount}
          title="Account Overview"
          subtitle={isCustomer ? "Customer profile" : isStaff ? "Staff profile" : "Admin profile"}
          actions={(
            <>
              {actions.map((action) => {
                const solidClass = isCustomer
                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-500"
                  : isStaff
                    ? "bg-sky-400 text-slate-950 hover:bg-sky-500"
                    : isAdmin
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-500"
                      : "bg-black text-white hover:bg-slate-800";

                return (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={[
                      "rounded-2xl px-5 py-3 text-sm font-semibold transition",
                      action.variant === "solid"
                        ? solidClass
                        : "border border-slate-300 bg-white text-slate-900 hover:border-black hover:text-black"
                    ].join(" ")}
                  >
                    {action.label}
                  </Link>
                );
              })}
            </>
          )}
        />
      </div>
    </MainLayout>
  );
}