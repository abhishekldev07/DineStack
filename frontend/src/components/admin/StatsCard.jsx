export default function StatsCard({
  title,
  value,
  subtitle,
  tone = "neutral"
}) {
  const toneStyles = {
    neutral: "from-slate-900 to-slate-700 text-white",
    emerald: "from-emerald-600 to-emerald-500 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    sky: "from-sky-600 to-cyan-500 text-white",
    rose: "from-rose-600 to-pink-500 text-white",
    violet: "from-indigo-600 to-violet-500 text-white"
  };

  return (
    <article className={`rounded-3xl bg-gradient-to-br ${toneStyles[tone] || toneStyles.neutral} p-[1px] shadow-[0_14px_40px_rgba(15,23,42,0.12)]`}>
      <div className="h-full rounded-[1.45rem] bg-white/10 p-5 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
          {title}
        </p>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-white sm:text-3xl">
              {value}
            </h3>
            {subtitle ? (
              <p className="mt-2 text-sm text-white/75">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="h-12 w-12 rounded-2xl border border-white/20 bg-white/10" />
        </div>
      </div>
    </article>
  );
}