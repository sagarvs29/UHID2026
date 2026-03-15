import { useState } from 'react';
import {
  usePendingVerifications,
  useVerifyStaff,
  useActiveStaff,
} from '@/hooks/useAdmin';
import {
  Stethoscope,
  Search,
  UserCheck,
  UserX,
  Calendar,
  BadgeCheck,
} from 'lucide-react';
import type { PendingMember, ActiveDoctor } from '@/types/admin';

export default function DoctorsPage() {
  const { data: pending = [] } = usePendingVerifications();
  const { data: staffData } = useActiveStaff();
  const verifyMutation = useVerifyStaff();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ member: PendingMember; action: 'VERIFY' | 'REJECT' } | null>(null);
  const [notes, setNotes] = useState('');

  const pendingDoctors = pending.filter((m) => m.role === 'DOCTOR');
  const verifiedDoctors = staffData?.doctors ?? [];

  const filteredVerified = verifiedDoctors.filter((d) =>
    search
      ? d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialty.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const handleConfirm = () => {
    if (!modal) return;
    verifyMutation.mutate(
      { userId: modal.member.id, input: { action: modal.action, notes: notes || undefined } },
      { onSuccess: () => { setModal(null); setNotes(''); } },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          Doctor Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage doctors affiliated with your hospital.
        </p>
      </div>

      {/* Pending doctors */}
      {pendingDoctors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            {pendingDoctors.length} doctor{pendingDoctors.length !== 1 ? 's' : ''} pending verification
          </h3>
          <div className="space-y-2">
            {pendingDoctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.specialty} · License: {doc.licenseNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal({ member: doc, action: 'VERIFY' })}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <UserCheck className="w-3 h-3 inline mr-1" /> Verify
                  </button>
                  <button
                    onClick={() => setModal({ member: doc, action: 'REJECT' })}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <UserX className="w-3 h-3 inline mr-1" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or specialty…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Verified doctors table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">
            Verified Doctors ({filteredVerified.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Specialty</th>
                <th className="text-left px-4 py-2 font-medium">License</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {filteredVerified.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                    No verified doctors found
                  </td>
                </tr>
              ) : (
                filteredVerified.map((doc) => (
                  <tr key={doc.userId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{doc.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{doc.specialty}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{doc.licenseNumber}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{doc.email}</td>
                    <td className="px-4 py-2.5">
                      {doc.verifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <BadgeCheck className="w-3 h-3" />
                          {new Date(doc.verifiedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {modal.action === 'VERIFY' ? 'Verify' : 'Reject'} — {modal.member.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {modal.action === 'VERIFY'
                ? 'This will verify the doctor and allow them to access patient data.'
                : 'Please provide a reason for rejection.'}
            </p>
            {modal.action === 'REJECT' && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for rejection…"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal(null); setNotes(''); }} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={verifyMutation.isPending || (modal.action === 'REJECT' && notes.length < 10)}
                className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                  modal.action === 'VERIFY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {verifyMutation.isPending ? 'Processing…' : modal.action === 'VERIFY' ? 'Verify Doctor' : 'Reject Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
