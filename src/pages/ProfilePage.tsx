import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { User as UserIcon, Download, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function ProfilePage() {
  const { profile, updateProfile, user, signOut } = useAuth();
  const { setPage } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-gray-500 mb-6">You need to be signed in to view your profile.</p>
          <button
            onClick={() => setPage('home')}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  /* GDPR Article 20 — data portability. Pulls a JSON envelope of
   * everything we hold about this user via export_user_data() and
   * triggers a browser download. We don't proxy through an edge
   * function: RLS + SECURITY DEFINER on the RPC are sufficient. */
  async function handleExport() {
    setExporting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('export_user_data');
      if (rpcError) throw rpcError;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `flyttgo-data-${(profile?.email ?? 'export').replace(/[^a-z0-9]+/gi, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Data export ready', { description: 'Your file has been downloaded.' });
    } catch (err: any) {
      toast.error('Could not export data', { description: err?.message ?? 'Unknown error' });
    } finally {
      setExporting(false);
    }
  }

  /* GDPR Article 17 — right to erasure. Soft-delete via the RPC:
   * profile PII is nulled, organization memberships revoked, every
   * notification marked read. Bookings / disputes / ratings are
   * preserved for audit + scoring continuity. The user is signed
   * out immediately and dropped on the home page. */
  async function handleDelete() {
    const phrase = window.prompt(
      'Type DELETE to permanently anonymise your account.\n\n' +
      'This cannot be undone. Bookings and ratings are retained for audit purposes ' +
      'but no contact info will remain.'
    );
    if (phrase !== 'DELETE') return;
    setDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;
      toast.success('Account deleted', { description: 'Your personal information has been removed.' });
      await signOut();
      setPage('home');
    } catch (err: any) {
      toast.error('Could not delete account', { description: err?.message ?? 'Unknown error' });
      setDeleting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const initial = (firstName?.[0] || profile.first_name?.[0] || 'U').toUpperCase();
  const displayName = `${firstName} ${lastName}`.trim() || 'User';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Profile</h1>
        <p className="text-gray-500 mb-8">Manage your personal information.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-700 flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900 truncate">{displayName}</p>
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded uppercase tracking-wide">
                {profile.role}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Contact support to change your email address.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 …"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setPage('home')}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              {saved && <span className="text-sm text-emerald-600 font-medium">Saved ✓</span>}
            </div>
          </form>
        </div>

        {/* ── Privacy & data controls ───────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Privacy &amp; data</h2>
          <p className="text-sm text-gray-500 mb-5">
            Download everything we hold about you, or permanently anonymise your account.
          </p>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 border border-gray-100 rounded-xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2">
                  <Download size={16} className="text-emerald-600" />
                  Export my data
                </p>
                <p className="text-sm text-gray-500">
                  Profile, bookings, disputes filed, ratings submitted, organisation
                  memberships, and notifications — as a single JSON file. GDPR Article 20.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 border border-emerald-600 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 disabled:opacity-60 transition flex-shrink-0"
              >
                {exporting ? 'Exporting…' : 'Download'}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 border border-red-100 bg-red-50/40 rounded-xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-700 mb-0.5 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Delete my account
                </p>
                <p className="text-sm text-gray-600">
                  Anonymises your profile and revokes any organisation memberships.
                  Bookings, disputes, and ratings stay attached for audit and provider
                  scoring. GDPR Article 17.
                </p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition flex-shrink-0"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
