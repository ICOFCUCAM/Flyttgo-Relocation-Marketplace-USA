import React from 'react';
import { DOCUMENT_TYPE_LABELS } from '../utils';
import {
  useApplicationDocuments,
  useSetDocumentVerification,
} from '../../../hooks/queries/useAdminDashboard';
import { getDocumentPublicUrl } from '../../../services/admin';
import type { ApplicationRow } from '../../../services/admin';

export function ApplicationDocsPanel({
  application,
  onClose,
}: {
  application: ApplicationRow;
  onClose: () => void;
}) {
  const { data: docs = [] } = useApplicationDocuments(application.id, application.user_id ?? null);
  const setVerification = useSetDocumentVerification(application.id);

  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-lg p-6 z-50 w-96">
      <h3 className="font-bold text-gray-800 mb-1">📄 Application Documents</h3>
      <p className="text-xs text-gray-500 mb-4">Application ID: {application.id}</p>
      {docs.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {docs.map(doc => (
            <div key={doc.id} className="p-3 border border-gray-100 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    {DOCUMENT_TYPE_LABELS[doc.document_type as string] ?? doc.document_type}
                  </div>
                  <div className="text-xs text-gray-400">
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded font-medium ${
                    doc.verification_status === 'approved' ? 'bg-green-100 text-green-700'
                    : doc.verification_status === 'rejected' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {doc.verification_status ?? 'pending'}
                </span>
              </div>
              <div className="flex gap-2">
                <a
                  href={getDocumentPublicUrl(doc.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 text-white px-3 py-1 text-xs rounded hover:bg-emerald-700 transition"
                >
                  View
                </a>
                <button
                  onClick={() => setVerification.mutate({ documentId: doc.id, status: 'approved' })}
                  className="bg-green-600 text-white px-2 py-1 text-xs rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => setVerification.mutate({ documentId: doc.id, status: 'rejected' })}
                  className="bg-red-600 text-white px-2 py-1 text-xs rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm">
        Close
      </button>
    </div>
  );
}
