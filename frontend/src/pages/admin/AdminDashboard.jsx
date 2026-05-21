import { useEffect, useMemo, useState } from "react";

import Sidebar from "../../components/admin/Sidebar";
import StatsCard from "../../components/admin/StatsCard";
import RevenueChart from "../../components/admin/RevenueChart";
import TopItems from "../../components/admin/TopItems";
import RecentOrders from "../../components/admin/RecentOrders";
import LowStockItems from "../../components/admin/LowStockItems";

import { getAllUsers } from "../../services/adminUserService";
import { getAdminMenuItems } from "../../services/adminMenuService";

import {
  getCustomRevenue,
  getDashboardAnalytics,
  getMonthlyRevenue,
  getOrdersCount,
  getRecentAdminOrders,
  getRevenueTotal,
  getTopItems
} from "../../services/analyticsService";

const currency = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

const orderDateInRange = (orderDate, startDate, endDate) => {
  if (!orderDate || !startDate || !endDate) {
    return false;
  }

  const current = new Date(orderDate).setHours(0, 0, 0, 0);
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();

  return current >= start && current <= end;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    customersCount: 0,
    menuItemsCount: 0,
    monthlyRevenue: 0
  });
  const [topItems, setTopItems] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customReport, setCustomReport] = useState(null);
  const [customError, setCustomError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [dashboardData, revenueData, ordersCountData, topItemsData, monthlyRevenueData, usersData, menuData, ordersData] = await Promise.all([
        getDashboardAnalytics().catch(() => null),
        getRevenueTotal().catch(() => null),
        getOrdersCount().catch(() => null),
        getTopItems().catch(() => null),
        getMonthlyRevenue().catch(() => null),
        getAllUsers().catch(() => null),
        getAdminMenuItems().catch(() => null),
        getRecentAdminOrders(1, 100).catch(() => null)
      ]);

      const allUsers = Array.isArray(usersData)
        ? usersData
        : Array.isArray(usersData?.users)
          ? usersData.users
          : [];

      const menuItems = Array.isArray(menuData)
        ? menuData
        : [];

      const orders = Array.isArray(ordersData?.orders)
        ? ordersData.orders
        : [];

      const dashboardTopItems = Array.isArray(dashboardData?.top_items)
        ? dashboardData.top_items
        : [];

      const normalizedOrders = orders
        .slice()
        .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

      const nextStats = {
        totalRevenue: Number(revenueData?.total_revenue ?? dashboardData?.total_revenue ?? 0),
        totalOrders: Number(ordersCountData?.total_orders ?? dashboardData?.total_orders ?? 0),
        pendingOrders: Number(ordersCountData?.pending_orders ?? dashboardData?.pending_orders ?? 0),
        preparingOrders: Number(ordersCountData?.preparing_orders ?? dashboardData?.preparing_orders ?? 0),
        deliveredOrders: Number(ordersCountData?.delivered_orders ?? dashboardData?.delivered_orders ?? 0),
        cancelledOrders: Number(ordersCountData?.cancelled_orders ?? dashboardData?.cancelled_orders ?? 0),
        customersCount: allUsers.filter((user) => String(user?.role || "").toLowerCase() === "customer").length,
        menuItemsCount: menuItems.length,
        monthlyRevenue: Number(monthlyRevenueData?.monthly_revenue ?? dashboardData?.monthly_revenue ?? 0)
      };

      setStats(nextStats);
      setTopItems((Array.isArray(topItemsData) && topItemsData.length ? topItemsData : dashboardTopItems).slice(0, 5));
      setRecentOrders(normalizedOrders.slice(0, 5));
      setAllOrders(orders);
      setLowStockItems(menuItems.filter((item) => item?.available === false));
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to load admin dashboard analytics."
      );
      setTopItems([]);
      setRecentOrders([]);
      setLowStockItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void fetchDashboard();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const handleGenerateReport = async () => {
    if (!customStartDate || !customEndDate) {
      setCustomError("Please select both a start date and an end date.");
      setCustomReport(null);
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      setCustomError("Start date must be earlier than or equal to end date.");
      setCustomReport(null);
      return;
    }

    try {
      setCustomLoading(true);
      setCustomError("");

      const customRevenueData = await getCustomRevenue(customStartDate, customEndDate);

      const ordersInRange = allOrders.filter((order) =>
        orderDateInRange(order.created_at, customStartDate, customEndDate)
      );

      const paidOrdersInRange = ordersInRange.filter((order) =>
        String(order.payment_status || "").toLowerCase() === "paid"
      );

      setCustomReport({
        revenue: Number(customRevenueData?.revenue ?? 0),
        totalOrders: ordersInRange.length,
        paidOrders: paidOrdersInRange.length,
        orders: ordersInRange
      });
    } catch (error) {
      console.error(error);
      setCustomReport(null);
      setCustomError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to generate the report."
      );
    } finally {
      setCustomLoading(false);
    }
  };

  const topCards = useMemo(() => ([
    {
      title: "Total Revenue",
      value: `Rs. ${currency.format(stats.totalRevenue)}`,
      subtitle: "All paid orders",
      tone: "neutral"
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      subtitle: "All recorded orders",
      tone: "sky"
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      subtitle: "Waiting for action",
      tone: "amber"
    },
    {
      title: "Delivered Orders",
      value: stats.deliveredOrders,
      subtitle: "Completed orders",
      tone: "emerald"
    },
    {
      title: "Customers Count",
      value: stats.customersCount,
      subtitle: "Customer accounts",
      tone: "violet"
    },
    {
      title: "Menu Items Count",
      value: stats.menuItemsCount,
      subtitle: "Active menu catalog",
      tone: "rose"
    }
  ]), [stats]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />

        <main className="relative flex-1 bg-slate-100">
          <div className="border-b border-slate-200 bg-white/80 px-5 py-5 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Admin Dashboard
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                  Business Overview
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Monitor sales, operational performance, inventory alerts, and order flow using live backend analytics.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDashboard}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 lg:w-auto lg:mt-0 mt-3"
              > 
                Refresh Analytics
              </button>
            </div>
          </div>

          <div className="space-y-8 px-5 py-6 lg:px-8 lg:py-8">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-200" />
                  ))}
                </div>
                <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
                  <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200" />
                  <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200" />
                </div>
              </div>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {topCards.map((card) => (
                    <StatsCard key={card.title} {...card} />
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                  <RevenueChart
                    monthlyRevenue={stats.monthlyRevenue}
                    totalRevenue={stats.totalRevenue}
                  />

                  <div className="space-y-6 rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Order Analytics
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">
                        Status Breakdown
                      </h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Total", value: stats.totalOrders, tone: "bg-slate-950 text-white" },
                        { label: "Pending", value: stats.pendingOrders, tone: "bg-amber-500 text-white" },
                        { label: "Preparing", value: stats.preparingOrders, tone: "bg-orange-500 text-white" },
                        { label: "Delivered", value: stats.deliveredOrders, tone: "bg-emerald-600 text-white" },
                        { label: "Cancelled", value: stats.cancelledOrders, tone: "bg-rose-600 text-white sm:col-span-2" }
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl px-4 py-4 shadow-sm ${item.tone}`}>
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] opacity-80">
                            {item.label}
                          </p>
                          <p className="mt-3 text-3xl font-black">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-500">Revenue Snapshot</p>
                      <p className="mt-2 text-3xl font-black text-slate-950">Rs. {currency.format(stats.totalRevenue)}</p>
                      <p className="mt-2 text-sm text-slate-500">Current paid revenue total from the backend analytics endpoint.</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2 min-w-0">

  <div className="min-w-0">
    <TopItems items={topItems} />
  </div>

  <div className="min-w-0 overflow-hidden rounded-[2rem] bg-white p-4 sm:p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
                    <div className="mb-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Custom Revenue Filter
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">
                        Generate Date Range Report
                      </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Start Date</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(event) => setCustomStartDate(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">End Date</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(event) => setCustomEndDate(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={customLoading}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {customLoading ? "Generating..." : "Generate Report"}
                    </button>

                    {customError ? (
                      <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                        {customError}
                      </p>
                    ) : null}

                    {customReport ? (
                      <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Revenue in range</span>
                          <span className="font-bold text-slate-950">Rs. {currency.format(customReport.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Total orders in range</span>
                          <span className="font-bold text-slate-950">{customReport.totalOrders}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Paid orders in range</span>
                          <span className="font-bold text-slate-950">{customReport.paidOrders}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Select a date range to generate a custom revenue summary.
                      </div>
                    )}
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <RecentOrders orders={recentOrders} />
                  <LowStockItems items={lowStockItems} />
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}