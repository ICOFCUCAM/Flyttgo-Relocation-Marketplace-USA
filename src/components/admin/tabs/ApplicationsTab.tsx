import { useAuth } from '../../../lib/auth';
import { REQUIRED_DOCS } from '../utils';
import { useReviewApplication } from '../../../hooks/queries/useAdminDashboard';
import type { ApplicationRow } from '../../../services/admin';
import type { AdminPanelHandlers } from '../types';

export function ApplicationsTab({
  applications,
  applicationDocStatus,
  handlers,
}: {
  applications: ApplicationRow[];
  applicationDocStatus: Record<string, string[]>;
  handlers: AdminPanelHandlers;
}) {
  const { user } = useAuth();
  const review = useReviewApplication();

  function runReview(app: ApplicationRow, action: 'approved' | 'rejected') {
    if (!user?.id) return;
    let rejectionReason: string | null = null;
    if (action === 'rejected') {
      const entered = window.prompt('Reason for rejection (visible to the driver on their status page):', '');
      if (entered === null) return;
      if (entered.trim().length === 0) {
        alert('Please enter a rejection reason so the driver knows what to fix.');
        return;
      }
      rejectionReason = entered.trim();
    }
    review.mutate(
      { applicationId: app.id, action, reviewerUserId: user.id, rejectionReason },
      {
        onSuccess: result => {
          if (action !== 'approved') return;
          if (!result.activated) {
            alert(
              'Driver cannot be activated.\nMissing approvals for:\n' +
                (result.missingDocs ?? []).join(', '),
            );
          } else {
            alert('✅ Driver activated successfully.');
          }
        },
        onError: err => alert('Review failed: ' + (err instanceof Error ? err.message : 'unknown')),
      },
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Driver Applications</h1>
      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Status / Docs</th>
            <th className="p-3 text-left">Applied</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <tr key={app.id} className="border-t">
              <td className="p-3 text-xs text-gray-500">{app.id}</td>
              <td className="p-3">
                <div className="text-xs font-medium text-gray-700 mb-1">{app.status}</div>
                <div className="flex flex-wrap gap-1">
                  {REQUIRED_DOCS.map(doc => {
                    const approved = applicationDocStatus[app.id]?.includes(doc);
                    return (
                      <span
                        key={doc}
                        className={`px-2 py-0.5 text-xs rounded font-medium ${
                          approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {doc.replace(/_/g, ' ')}{approved ? ' ✔' : ''}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td className="p-3 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
              <td className="p-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => runReview(app, 'approved')}
                  disabled={review.isPending}
                  className="bg-emerald-600 disabled:opacity-50 text-white px-2 py-1 text-xs rounded hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => runReview(app, 'rejected')}
                  disabled={review.isPending}
                  className="bg-red-600 disabled:opacity-50 text-white px-2 py-1 text-xs rounded"
                >
                  Reject
                </button>
                <button
                  onClick={() => handlers.openApplicationDocs(app)}
                  className="bg-gray-700 text-white px-2 py-1 text-xs rounded"
                >
                  View Docs
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
