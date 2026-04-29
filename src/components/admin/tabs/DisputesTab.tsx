import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminListDisputes } from '../../../lib/admin-disputes-store';
import type { DisputeRow as DisputeRowData } from '../../../lib/disputes-store';
import { DisputeRow } from './DisputeRow';

export function DisputesTab() {
  const [disputes, setDisputes] = useState<DisputeRowData[]>([]);
  const [loading, setLoading]   = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setDisputes(await adminListDisputes());
    } catch (err) {
      toast.error('Failed to load disputes', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Disputes</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{disputes.length} open + closed cases</span>
          <button
            onClick={() => void refresh()}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && disputes.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-sm text-gray-500">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-sm text-gray-500">
          No disputes filed yet. Customer-side filing happens at /dispute.
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="p-3 text-left">Filed</th>
                <th className="p-3 text-left">Country · category</th>
                <th className="p-3 text-left">Booking</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Suggested</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <DisputeRow key={d.id} dispute={d} onChanged={refresh} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
