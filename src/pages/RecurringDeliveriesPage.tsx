import { useApp } from '../lib/store';
import { Repeat, CalendarClock, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { FOCUS_RING } from '../components/ds';

/**
 * /business/recurring-deliveries — enterprise landing page.
 *
 * No invented metrics — explains what the recurring-bookings
 * feature does, who it's for, and how to start. Routing intake
 * goes through the existing /request-quote flow until a dedicated
 * recurring-bookings UI ships.
 */
export default function RecurringDeliveriesPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-slate-900">
      <section className="bg-gradient-to-br from-[#0b1f3a] via-[#0b1f3a] to-[#1a4a8a] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-amber-300 text-[11px] font-bold uppercase tracking-[0.22em] font-mono mb-3">
            Enterprise · recurring deliveries
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 max-w-3xl">
            Standing relocation lanes for offices, universities, and bonded warehousing.
          </h1>
          <p className="text-white/75 max-w-2xl leading-relaxed mb-8">
            FlyttGo's recurring-bookings program coordinates fixed-cadence pickups across
            licensed providers in every active market. Set the cadence, FlyttGo handles
            dispatch, escrow, and consolidated billing.
          </p>
          <button
            onClick={() => setPage('request-quote')}
            className={`inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold ${FOCUS_RING}`}
          >
            Request a recurring lane <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-3 gap-5">
        {[
          {
            icon: <Repeat className="w-5 h-5" />,
            title: 'Fixed cadence',
            body: 'Daily, weekly, biweekly, or monthly pickups under one master agreement. Reschedule any leg without re-quoting.',
          },
          {
            icon: <CalendarClock className="w-5 h-5" />,
            title: 'Same-driver preference',
            body: 'Dispatch favours the previous trip\'s licensed provider so handover quality stays consistent across the contract window.',
          },
          {
            icon: <FileSpreadsheet className="w-5 h-5" />,
            title: 'Consolidated billing',
            body: 'One PO covers the whole cadence. Monthly invoice with per-leg breakdown, VAT/sales-tax computed per jurisdiction.',
          },
        ].map(c => (
          <div key={c.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              {c.icon}
            </div>
            <h2 className="font-bold text-slate-900 mb-1.5">{c.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-amber-700 text-[11px] uppercase tracking-[0.22em] font-mono mb-3">Use cases</p>
          <h2 className="text-2xl font-extrabold mb-6">Where recurring lanes fit</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Corporate office moves with monthly tenant churn',
              'University residence-hall arrival + departure cycles',
              'NGO field-camp resupply between bonded warehouses',
              'Government depot rotations across regional offices',
              'Hospitality chains: scheduled linen / equipment moves',
              'Retail: in-region store-replenishment lanes',
            ].map(item => (
              <div key={item} className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
        <h2 className="text-2xl font-extrabold mb-3">Start with a single corridor</h2>
        <p className="text-slate-600 max-w-xl mx-auto mb-6">
          Brief the route, cadence, and SLA in the standard quote form — your account manager
          turns it into a recurring contract once approved.
        </p>
        <button
          onClick={() => setPage('request-quote')}
          className={`inline-flex items-center gap-2 bg-[#0B2E59] hover:bg-[#0F3558] text-white px-5 py-3 rounded-xl text-sm font-bold ${FOCUS_RING}`}
        >
          Request a quote <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </main>
  );
}
