import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { calcCommission, formatDuration, safeNumber } from '../utils';
import {
  useDriverJobs,
  useAcceptJob,
  useStartJob,
  useFinishJob,
  useDriverConfirmation,
} from '../../../hooks/queries/useDriverPortal';
import type { JobRow } from '../../../services/driver';

const NearbyJobsMap = lazy(() => import('../../NearbyJobsMap'));

export function JobsTab({
  driverId,
  plan,
}: {
  driverId: string | null | undefined;
  plan: string | null | undefined;
}) {
  const { t } = useTranslation();
  const [showMap, setShowMap] = useState(true);

  const { data: jobs = [] } = useDriverJobs(driverId, plan);
  const accept   = useAcceptJob(driverId, plan);
  const start    = useStartJob(driverId, plan);
  const finish   = useFinishJob(driverId, plan);
  const confirm  = useDriverConfirmation(driverId, plan);

  function handleAccept(job: JobRow) {
    accept.mutate(job.id, {
      onSuccess: won => {
        if (!won) toast(t('driverPortal.jobTaken'));
      },
      onError: e => toast.error('Accept failed', { description: e instanceof Error ? e.message : '' }),
    });
  }

  function handleConfirm(jobId: string) {
    confirm.mutate(jobId, {
      onSuccess: ({ customerDone }) => {
        if (customerDone) toast.success('Payment released to your wallet!');
        else toast('Confirmed! Waiting for customer confirmation.');
      },
    });
  }

  const pendingJobs = jobs.filter(j => j.status === 'pending');

  return (
    <div className="space-y-4">
      {jobs.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">📍 {t('driverPortal.mapView')}</h3>
              <p className="text-xs text-gray-500">Tap a pin to see job details and accept.</p>
            </div>
            <button
              onClick={() => setShowMap(s => !s)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              {showMap ? t('driverPortal.hideMap') : t('driverPortal.showMap')}
            </button>
          </div>
          {showMap && (
            <Suspense fallback={<div className="h-96 rounded-2xl bg-gray-100 animate-pulse" />}>
              <NearbyJobsMap jobs={pendingJobs} onAccept={handleAccept} />
            </Suspense>
          )}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">{t('driverPortal.noJobs')}</div>
      )}

      {jobs.map(job => {
        const price = safeNumber(job.final_price ?? job.original_price ?? job.price_estimate);
        const comm  = calcCommission(price, plan ?? 'silver');
        return (
          <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">{job.pickup_address}</p>
                <p className="text-sm text-gray-500">{job.dropoff_address}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                job.status === 'awaiting_driver' ? 'bg-yellow-100 text-yellow-700' :
                job.status === 'in_transit'      ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {job.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
              <p>Estimated: {job.estimated_hours ?? '-'} hrs</p>
              <p>Actual: {job.actual_hours ?? 'Running'}</p>
              <p>Timer: {formatDuration(job.start_time, job.end_time)}</p>
              <p>Move date: {job.move_date ?? '-'}</p>
            </div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-2xl font-bold text-green-600">{safeNumber(comm.earning).toFixed(0)} USD</p>
                <p className="text-xs text-gray-500">
                  Commission: {safeNumber(comm.rate * 100).toFixed(0)}% ({safeNumber(comm.commission).toFixed(0)} USD)
                </p>
              </div>
              <p className="text-sm text-gray-500">Total: {safeNumber(price).toFixed(0)} USD</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {job.status === 'awaiting_driver' && (
                <button onClick={() => handleAccept(job)} disabled={accept.isPending}
                  className="bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
                  {t('driverPortal.acceptJob')}
                </button>
              )}
              {job.status === 'driver_assigned' && (
                <button onClick={() => start.mutate(job.id)} disabled={start.isPending}
                  className="bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
                  {t('driverPortal.startJob')}
                </button>
              )}
              {job.status === 'in_transit' && (
                <button onClick={() => finish.mutate(job.id)} disabled={finish.isPending}
                  className="bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
                  {t('driverPortal.finishJob')}
                </button>
              )}
              {job.status === 'completed' && !job.driver_confirmation && (
                <button onClick={() => handleConfirm(job.id)} disabled={confirm.isPending}
                  className="bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
                  {t('driverPortal.confirmCompletion')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
