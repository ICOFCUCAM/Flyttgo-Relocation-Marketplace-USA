
export function SignInBanner({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900">Sign in to complete your booking</p>
        <p className="text-xs text-blue-700 mt-0.5">
          You can fill in all the details now — we&apos;ll ask you to sign in before you confirm payment.
        </p>
      </div>
      <button
        type="button"
        onClick={onSignIn}
        className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        Sign In
      </button>
    </div>
  );
}
