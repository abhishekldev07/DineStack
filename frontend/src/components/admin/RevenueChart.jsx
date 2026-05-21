import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

export default function RevenueChart({
  monthlyRevenue = 0,
  totalRevenue = 0
}) {
  const chartData = [
    {
      label: new Date().toLocaleString("en-US", { month: "short" }),
      revenue: Number(monthlyRevenue) || 0
    },
    {
      label: "Total",
      revenue: Number(totalRevenue) || 0
    }
  ];

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Revenue Section
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Monthly Revenue Performance
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            This Month
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">
            Rs. {currencyFormatter.format(Number(monthlyRevenue) || 0)}
          </p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
            <YAxis tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(value) => `Rs. ${value}`} />
            <Tooltip
              formatter={(value) => [`Rs. ${currencyFormatter.format(Number(value) || 0)}`, "Revenue"]}
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 32px rgba(15,23,42,0.12)"
              }}
            />
            <Bar dataKey="revenue" fill="#111827" radius={[16, 16, 0, 0]} barSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}