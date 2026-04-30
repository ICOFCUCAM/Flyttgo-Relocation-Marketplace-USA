import { TOTAL_STEPS } from './types';

export function ProgressBar({
  step,
  stepLabels,
  onJumpTo,
}: {
  step: number;
  stepLabels: string[];
  onJumpTo: (s: number) => void;
}) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-soft">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => {
            const sNum = i + 1;
            const isActive = sNum === step;
            const isDone = sNum < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => isDone && onJumpTo(sNum)}
                disabled={!isDone}
                className={`flex flex-col items-center gap-1 flex-1 group ${isDone ? 'cursor-pointer' : 'cursor-default'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-base ease-marketplace
                  ${isDone ? 'bg-trust-600 text-white group-hover:scale-110' : isActive ? 'bg-brand-500 text-ink-900 ring-4 ring-brand-500/20' : 'bg-slate-100 text-slate-400'}`}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : sNum}
                </div>
                <span className={`text-[10px] sm:text-[11px] truncate max-w-[5rem] sm:max-w-none ${isActive ? 'text-brand-600 font-semibold' : isDone ? 'text-trust-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-ink-900 via-brand-500 to-trust-600 h-1.5 rounded-full transition-all duration-500 ease-marketplace"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
