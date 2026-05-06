import { Suspense, lazy } from 'react';
import { useUpdateDriverStatus } from '../../../hooks/queries/useAdminDashboard';

const FleetMap = lazy(() => import('../../FleetMap'));

export function FleetMapTab() {
  const updateDriverStatus = useUpdateDriverStatus();

  return (
    <div>
      <Suspense
        fallback={
          <div className="bg-gray-100 rounded-xl h-[600px] animate-pulse flex items-center justify-center text-gray-400 text-sm">
            Loading fleet map…
          </div>
        }
      >
        <FleetMap
          onSuspendDriver={(id: string) => {
            if (confirm('Suspend this driver?')) {
              updateDriverStatus.mutate({ id, status: 'suspended' });
            }
          }}
        />
      </Suspense>
    </div>
  );
}
