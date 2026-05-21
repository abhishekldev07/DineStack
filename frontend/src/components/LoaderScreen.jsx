export default function LoaderScreen({
  message = 'Preparing your dining experience...',
  showMessage = true,
  className = '',
}) {
  return (
    <div
      className={[
        'fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden',
        'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_36%),linear-gradient(180deg,_#050505_0%,_#050505_35%,_#020202_100%)]',
        'text-white',
        className,
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Loading DineStack"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.06),_transparent_34%),radial-gradient(circle_at_70%_30%,_rgba(255,255,255,0.04),_transparent_28%)]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative flex w-full max-w-xl flex-col items-center px-6 text-center">
        <div className="absolute h-64 w-64 rounded-full bg-amber-400/20 blur-3xl animate-loader-glow" />

        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-3xl animate-loader-glow" />
          <div className="absolute inset-[-18px] rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_80px_rgba(251,191,36,0.12)]" />

          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_24px_100px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:h-44 sm:w-44">
            <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,_rgba(251,191,36,0.24),_transparent_70%)] blur-xl animate-loader-glow" />
            <div className="absolute inset-[22px] rounded-full border border-amber-300/15 bg-amber-300/5" />
            <img
              src="/loader.png"
              alt="DineStack"
              className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_0_24px_rgba(251,191,36,0.45)] animate-loader-breath sm:h-24 sm:w-24"
            />
          </div>
        </div>

        <div className="space-y-5">
          {showMessage ? (
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.42em] text-amber-200/70">
                DineStack
              </p>
              <p className="text-balance text-lg font-semibold text-white/90 sm:text-xl">
                {message}
              </p>
            </div>
          ) : null}

          <div className="mx-auto flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.65)] animate-loader-dot [animation-delay:0ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-200/90 shadow-[0_0_14px_rgba(251,191,36,0.45)] animate-loader-dot [animation-delay:140ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.28)] animate-loader-dot [animation-delay:280ms]" />
          </div>

          <div className="relative mx-auto h-px w-52 overflow-hidden rounded-full bg-white/10 sm:w-64">
            <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-300/80 to-transparent animate-loader-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}