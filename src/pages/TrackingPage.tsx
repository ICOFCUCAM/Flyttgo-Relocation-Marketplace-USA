import { useState, useEffect, useRef } from 'react';
import { INPUT_FOCUS } from '../components/ds';
import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, Truck, FileCheck, UserCheck, Timer, CheckCircle, Loader2 } from 'lucide-react';
import { useApp } from '../lib/store';
import DeliveryMap from '../components/DeliveryMap';
import { useAuth } from '../lib/auth';
import {
  useActiveBookingForCustomer,
  useTrackingBookingSearch,
  useTrackingDriver,
  useBookingRealtime,
} from '../hooks/queries/useCustomerBookings';

interface Stage { label: string; time: string; done: boolean; icon: string; }

const DEFAULT_STAGES: Stage[] = [
  { label: 'Booking Confirmed',           time: '',  done: false, icon: '✅' },
  { label: 'Driver Assigned',             time: '',  done: false, icon: '👤' },
  { label: 'Driver En Route to Pickup',   time: '',  done: false, icon: '🚗' },
  { label: 'Items Loaded',                time: '',  done: false, icon: '📦' },
  { label: 'In Transit',                  time: '',  done: false, icon: '🚚' },
  { label: 'Delivered',                   time: '',  done: false, icon: '🏠' },
];

const STATUS_TO_STAGE: Record<string, number> = {
  pending: 0, confirmed: 1, driver_assigned: 2,
  in_progress: 4, in_transit: 4, completed: 5, customer_confirmed: 5,
};

function ProgressRing({ pct }: { pct: number }) {
  const r = 54; const c = 2 * Math.PI * r;
  return (
    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#10b981" strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" className="transition-all duration-1000"/>
    </svg>
  );
}

export default function TrackingPage() {
  const { t } = useTranslation();
  const { setPage } = useApp();
  const { user } = useAuth();
  const [bookingId, setBookingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searched, setSearched] = useState(false);
  const [eta, setEta] = useState(12);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ text: string; from: 'you' | 'driver'; time: string }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  /* Two sources for "which booking are we tracking":
   *   1. Auto-load: the user's currently in-flight booking (if any).
   *   2. Search: the user pasted a booking id and pressed Enter.
   * We prefer the searched booking once searchTerm is non-empty so a
   * customer who tracks a friend's booking doesn't keep getting
   * bumped back to their own active row. */
  const { data: activeBooking } = useActiveBookingForCustomer(user?.id);
  const { data: searchedBooking, isFetching: searchLoading } = useTrackingBookingSearch(searchTerm);
  const booking = searchTerm ? searchedBooking ?? null : activeBooking ?? null;

  /* Live realtime stream — the moment dispatch flips status or the
   * driver beacon writes a new lat/lng, the React Query cache for
   * this booking is invalidated and the map + timeline re-render. */
  useBookingRealtime(booking?.id ?? null);

  /* Pull real driver context for the tracking card. driver_id is
   * populated when dispatch has matched a booking; while it's null
   * the card renders the "awaiting assignment" empty state. */
  const { data: driver } = useTrackingDriver(booking?.driver_id ?? null);

  /* Status helpers — power the LIVE / DELIVERED badges on the
   * active-state header. */
  const status = booking?.status ?? '';
  const isLive       = status === 'in_progress' || status === 'in_transit' || status === 'driver_assigned';
  const isDelivered  = status === 'completed' || status === 'customer_confirmed';

  /* Mark "searched" for either source so the rest of the UI renders. */
  useEffect(() => {
    if (booking) setSearched(true);
  }, [booking]);

  /* ETA countdown */
  useEffect(() => {
    if (!searched) return undefined;
    const timer = setInterval(() => setEta(p => Math.max(0, p - 1)), 15000);
    return () => clearInterval(timer);
  }, [searched]);

  /* Scroll chat */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  /* Derive stage timeline from the booking status. */
  const stages: Stage[] = (() => {
    const idx = STATUS_TO_STAGE[booking?.status ?? ''] ?? 0;
    return DEFAULT_STAGES.map((s, i) => ({
      ...s,
      done: i <= idx,
      time: i <= idx ? new Date(Date.now() - (idx - i) * 900_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    }));
  })();

  function handleTrack() {
    const q = bookingId.trim();
    if (!q) return undefined;
    setSearchTerm(q);
    setSearched(true);
  }

  function sendMessage() {
    if (!message.trim()) return undefined;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(m => [...m, { text: message, from: 'you', time: now }]);
    setMessage('');
    setTimeout(() => setMessages(m => [...m, { text: "Got it, thanks! I'll be there shortly.", from: 'driver', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]), 3000);
  }

  const activeIdx = stages.filter(s => s.done).length - 1;
  const pct = ((activeIdx + 1) / stages.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HERO / SEARCH — background photo + brand-aligned scrim,
       *   matches the MarketplaceBanner inverse variant used on the
       *   rest of the platform. */}
      <section className="relative pt-12 pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1920&q=70"
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/75" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          {/* Status pill row — LIVE / DELIVERED / standby. Shown
           *  prominently above the title so the customer sees the
           *  current state of their move at a glance. */}
          <div className="flex justify-center mb-4">
            {isLive ? (
              <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            ) : isDelivered ? (
              <span className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-bold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Delivered
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-bold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full">
                📍 {t('tracking.badge')}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">{t('tracking.title')}</h1>
          <p className="text-white/70 mb-8">{t('tracking.subtitle')}</p>
          <div className="flex gap-2 max-w-lg mx-auto">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm">🔍</span>
              <input
                value={bookingId}
                onChange={e => setBookingId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
                placeholder={t('tracking.searchPlaceholder')}
                className={`w-full pl-9 pr-4 py-3.5 rounded-xl text-sm shadow-lg ${INPUT_FOCUS}`}
              />
            </div>
            <button onClick={handleTrack} disabled={searchLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition disabled:opacity-60 whitespace-nowrap shadow-lg shadow-amber-500/30">
              {searchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {searchLoading ? '...' : t('tracking.trackBtn')}
            </button>
          </div>
          {!user && (
            <p className="text-white/40 text-xs mt-3">
              <button onClick={() => setPage('home')} className="underline hover:text-white/70">{t('auth.signInTitle')}</button> {t('tracking.signInHint')}
            </p>
          )}
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-center gap-6 text-xs text-gray-500 font-medium">
          {[
            { icon: '🔒', key: 'tracking.trustEscrow' },
            { icon: '📍', key: 'tracking.trustGps' },
            { icon: '⭐', key: 'tracking.trustRating' },
            { icon: '🛡️', key: 'tracking.trustInsured' },
            { icon: '📞', key: 'tracking.trustSupport' },
          ].map(b => (
            <span key={b.key}>{b.icon} {t(b.key)}</span>
          ))}
        </div>
      </div>

      {/* NOT FOUND */}
      {searched && !booking && (
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('tracking.notFoundTitle')}</h2>
          <p className="text-gray-500 mb-6">{t('tracking.notFoundBody')}</p>
          <button onClick={() => setPage('my-bookings')} className="px-6 py-3 bg-[#0B2E59] text-white rounded-xl font-semibold text-sm">{t('tracking.viewBookings')}</button>
        </div>
      )}

      {/* TRACKING PANEL */}
      {searched && booking && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-6">

            {/* LEFT — Map + Chat */}
            <div className="lg:col-span-2 space-y-4">

              {/* LIVE MAP — DeliveryMap with Leaflet + Supabase geocoding */}
              <DeliveryMap
                pickupAddress={booking.pickup_address || 'Karl Johans gate 1, New York'}
                deliveryAddress={booking.dropoff_address || 'Storgata 15, Phoenix'}
                status={booking.status || 'in_transit'}
                mode="customer"
                driverLat={booking.driver_lat ?? null}
                driverLng={booking.driver_lng ?? null}
                className="shadow-sm"
              />

              {/* DRIVER CARD — real driver_profiles + most-recent
               *   driver_application data when dispatch has matched
               *   a driver to this booking. Falls back to an
               *   "awaiting assignment" state when driver_id is
               *   still null. */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#0B2E59] to-[#1a4a8a] px-5 py-4">
                  <p className="text-white/40 text-[10px] font-bold tracking-[0.18em] uppercase mb-1">Your driver</p>
                  <div className="flex items-center gap-1.5">
                    {driver?.fullName ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <p className="text-emerald-300 text-xs font-semibold">
                          {driver.online ? 'Online · en route' : 'Assigned'}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        <p className="text-amber-300 text-xs font-semibold">Awaiting assignment</p>
                      </>
                    )}
                  </div>
                </div>
                {driver?.fullName ? (
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {driver.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{driver.fullName}</p>
                        {(driver.vehicleMake || driver.vehicleModel) && (
                          <p className="text-xs text-slate-500 truncate">
                            {[driver.vehicleMake, driver.vehicleModel, driver.vehicleYear ? `(${driver.vehicleYear})` : null]
                              .filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {driver.vehicleRegistration && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
                        <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Plate</span>
                        <span className="font-bold text-slate-900 text-sm font-mono tracking-widest">{driver.vehicleRegistration}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {driver.phone && (
                        <a
                          href={`tel:${driver.phone}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0B2E59] hover:bg-[#0F3558] text-white py-2.5 rounded-xl text-sm font-bold transition"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                      <a
                        href="https://wa.me/447432112438"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2.5 rounded-xl text-sm font-bold transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Support
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Truck className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="text-slate-700 font-semibold text-sm mb-1">Matching your driver</p>
                    <p className="text-slate-500 text-xs">A verified operator will be assigned to your booking shortly. You&apos;ll get a notification when matched.</p>
                  </div>
                )}
              </div>

              {/* CHAT — collapsed below the driver card. */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Chat with your driver</p>
                </div>
                <div ref={chatRef} className="h-40 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs shadow-sm">
                      Hi! I&apos;m on my way. Should be there in about {eta} minutes 🚐
                    </div>
                  </div>
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-xs ${m.from === 'you' ? 'bg-[#0B2E59] text-white rounded-tr-sm' : 'bg-white border border-gray-100 rounded-tl-sm shadow-sm'}`}>
                        {m.text}
                        <div className={`text-xs mt-1 ${m.from === 'you' ? 'text-white/60' : 'text-gray-400'}`}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 p-3 border-t border-gray-100 bg-white">
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder={t('tracking.chatPlaceholder')}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0B2E59] outline-none"
                  />
                  <button onClick={sendMessage} className="px-4 py-2.5 bg-[#0B2E59] text-white rounded-xl text-sm font-medium">{t('tracking.sendBtn')}</button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-4">

              {/* Progress ring */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <ProgressRing pct={pct}/>
                  <div className="absolute text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{Math.round(pct)}%</div>
                    <div className="text-xs text-gray-400">{t('tracking.complete')}</div>
                  </div>
                </div>
                <div className="mt-3 font-semibold text-[#0B2E59]">
                  {t(`tracking.stage${Math.max(activeIdx, 0)}`)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {eta > 0 ? t('tracking.arrivingIn', { min: eta }) : t('tracking.delivered')}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-[#0B2E59] mb-4 text-sm">{t('tracking.timeline')}</h3>
                <div className="space-y-0">
                  {stages.map((stage, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${stage.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {stage.done ? '✓' : stage.icon}
                        </div>
                        {i < stages.length - 1 && (
                          <div className={`w-0.5 h-6 ${stage.done ? 'bg-emerald-300' : 'bg-gray-200'}`}/>
                        )}
                      </div>
                      <div className="pb-2">
                        <div className={`text-sm font-medium leading-tight ${stage.done ? 'text-[#0B2E59]' : 'text-gray-400'}`}>{t(`tracking.stage${i}`)}</div>
                        {stage.time && <div className="text-xs text-gray-400 mt-0.5">{stage.time}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-[#0B2E59] mb-4 text-sm">{t('tracking.bookingDetails')}</h3>
                <div className="space-y-2.5">
                  {[
                    { label: t('tracking.bookingId'), value: booking.id?.slice(0,8).toUpperCase() || 'BK-7842', key: 'bookingId' },
                    { label: t('tracking.service'), value: booking.van_type || 'Large Van', key: 'service' },
                    { label: t('tracking.moveDate'), value: booking.move_date || 'Today', key: 'moveDate' },
                    { label: t('tracking.total'), value: `${Number(booking.final_price || booking.price_estimate || 2450).toFixed(0)} USD`, key: 'total' },
                    { label: 'Payment', value: booking.payment_status === 'escrow' ? '🔒 In Escrow' : booking.payment_status || 'Secured', key: 'payment' },
                  ].map(row => (
                    <div key={row.key} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-semibold ${row.key === 'total' ? 'text-[#F2B705]' : 'text-gray-900'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPage('my-bookings')} className="mt-4 w-full py-2.5 border-2 border-[#0B2E59] text-[#0B2E59] rounded-xl text-sm font-semibold hover:bg-[#0B2E59] hover:text-white transition">
                  {t('tracking.viewAll')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* EMPTY STATE — not searched yet */}
      {!searched && (
        <>
          {/* STAGES PREVIEW — visual outline of what live tracking
           *   will show once the customer enters their booking ref.
           *   Mirrors the Active-state Timeline so the empty state
           *   reads as "here's what you'll see", not a stub. */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
            <p className="text-amber-700 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Delivery progress</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-10">Track every stage of your delivery</h2>
            <div className="relative">
              {/* Gradient connector line — only visible at sm+. */}
              <div
                className="absolute top-7 left-[10%] right-[10%] h-0.5 hidden sm:block"
                style={{ background: 'linear-gradient(90deg, #cbd5e1 0%, #0b1f3a 50%, #f59e0b 100%)' }}
                aria-hidden="true"
              />
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 relative">
                {[
                  { label: 'Booking confirmed', Icon: FileCheck,   bg: '#fef3c7', iconColor: '#b45309', numColor: '#b45309' },
                  { label: 'Driver assigned',   Icon: UserCheck,   bg: '#fde68a', iconColor: '#92400e', numColor: '#92400e' },
                  { label: 'Driver en route',   Icon: Truck,       bg: '#0b1f3a', iconColor: '#ffffff', numColor: '#ffffff' },
                  { label: 'Arriving soon',     Icon: Timer,       bg: '#fef3c7', iconColor: '#b45309', numColor: '#b45309' },
                  { label: 'Delivered',         Icon: CheckCircle, bg: '#f59e0b', iconColor: '#0b1f3a', numColor: '#0b1f3a' },
                ].map(({ label, Icon, bg, iconColor, numColor }, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center mb-3 shadow-sm border border-slate-200"
                      style={{ background: bg }}
                    >
                      <Icon style={{ color: iconColor }} className="w-5 h-5 mb-0.5" />
                      <span className="font-extrabold text-[10px] leading-none" style={{ color: numColor }}>{i + 1}</span>
                    </div>
                    <p className="text-slate-600 text-xs font-semibold leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-10">Timeline activates once tracking begins.</p>
          </section>

          {/* FEATURE CARDS — translation-keyed marketing strip. */}
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: '📍', titleKey: 'tracking.featureGps', descKey: 'tracking.featureGpsDesc' },
                { icon: '💬', titleKey: 'tracking.featureChat', descKey: 'tracking.featureChatDesc' },
                { icon: '🔒', titleKey: 'tracking.featureEscrow', descKey: 'tracking.featureEscrowDesc' },
              ].map(f => (
                <div key={f.titleKey} className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                  <div className="text-4xl mb-3">{f.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{t(f.titleKey)}</h3>
                  <p className="text-gray-500 text-sm">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
