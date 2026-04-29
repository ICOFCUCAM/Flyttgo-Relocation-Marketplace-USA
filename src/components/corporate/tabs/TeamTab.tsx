import React from 'react';

const MEMBERS = [
  { name: 'Ola Nordmann', role: 'Admin',   dept: 'Operations',   status: 'Active',  last: 'Now' },
  { name: 'Kari Hansen',  role: 'Booker',  dept: 'Logistics',    status: 'Active',  last: '2h ago' },
  { name: 'Per Eriksen',  role: 'Finance', dept: 'Accounts',     status: 'Active',  last: 'Yesterday' },
  { name: 'Ingrid Berg',  role: 'Viewer',  dept: 'Procurement',  status: 'Pending', last: 'Never' },
];

export function TeamTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">4 team members · 2 pending invites</p>
        <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
          + Invite Member
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Member', 'Role', 'Department', 'Status', 'Last Active', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MEMBERS.map(m => (
              <tr key={m.name} className="hover:bg-gray-50">
                <td className="py-3.5 px-4 font-medium">{m.name}</td>
                <td className="py-3.5 px-4">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{m.role}</span>
                </td>
                <td className="py-3.5 px-4 text-gray-500">{m.dept}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {m.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-gray-400">{m.last}</td>
                <td className="py-3.5 px-4">
                  <button className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
