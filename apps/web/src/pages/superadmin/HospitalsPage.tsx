import { useState } from 'react';
import { useHospitalList, useHospitalAction } from '@/hooks/useAdmin';
import {
  Hospital,
  Search,
  BadgeCheck,
  XCircle,
  MapPin,
  Users,
  UserCog,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function HospitalsPage() {
  const { data: hospitals = [], isLoading } = useHospitalList();
  const hospitalAction = useHospitalAction();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [actionModal, setActionModal] = useState<{
    hospital: typeof hospitals[0];
    action: 'VERIFY' | 'SUSPEND';
  } | null>(null);
  const [notes, setNotes] = useState('');

  const filtered = hospitals
    .filter((h) => {
      if (filter === 'verified') return h.isVerified;
      if (filter === 'pending') return !h.isVerified;
      return true;
    })
    .filter((h) =>
      search
        ? h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.city.toLowerCase().includes(search.toLowerCase()) ||
          h.state.toLowerCase().includes(search.toLowerCase())
        : true,
    );

  const pendingCount = hospitals.filter((h) => !h.isVerified).length;
  const verifiedCount = hospitals.filter((h) => h.isVerified).length;

  const handleAction = () => {
    if (!actionModal) return;
    hospitalAction.mutate(
      { hospitalId: actionModal.hospital.id, action: actionModal.action, notes: notes || undefined },
      { onSuccess: () => { setActionModal(null); setNotes(''); } },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Hospital className="w-6 h-6 text-primary" />
          Hospital Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify, suspend, or manage all registered hospitals on the UHID platform.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Hospitals</p>
          <p className="text-2xl font-bold text-foreground">{hospitals.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Verified</p>
          <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} hospital{pendingCount !== 1 ? 's' : ''} awaiting verification
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Hospitals cannot onboard doctors or staff until verified.
            </p>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, or state…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'verified'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-muted/40 text-foreground'
              }`}
            >
              {f === 'all' ? `All (${hospitals.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Verified (${verifiedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-3 font-medium">Hospital</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium">Admin</th>
                <th className="text-center px-4 py-3 font-medium">Doctors</th>
                <th className="text-center px-4 py-3 font-medium">Staff</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No hospitals found
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{h.name}</p>
                        <p className="text-xs text-muted-foreground">Reg# {h.registrationNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {h.city}, {h.state}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {h.adminName ? (
                        <div>
                          <p className="text-xs font-medium">{h.adminName}</p>
                          <p className="text-[11px] text-muted-foreground">{h.adminEmail}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3" /> {h.doctorCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <UserCog className="w-3 h-3" /> {h.staffCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        h.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {h.isVerified ? <><BadgeCheck className="w-3 h-3" /> Verified</> : <><XCircle className="w-3 h-3" /> Pending</>}
                      </span>
                      {h.isNABH && (
                        <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                          NABH
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(h.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {!h.isVerified ? (
                          <button
                            onClick={() => setActionModal({ hospital: h, action: 'VERIFY' })}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            <BadgeCheck className="w-3 h-3 inline mr-1" />Verify
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionModal({ hospital: h, action: 'SUSPEND' })}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {actionModal.action === 'VERIFY' ? 'Verify' : 'Suspend'} — {actionModal.hospital.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {actionModal.action === 'VERIFY'
                ? 'This will verify the hospital, allowing them to onboard doctors and staff.'
                : 'This will suspend the hospital. Their staff will lose platform access.'}
            </p>
            {actionModal.action === 'SUSPEND' && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for suspension…"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setActionModal(null); setNotes(''); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={hospitalAction.isPending || (actionModal.action === 'SUSPEND' && !notes.trim())}
                className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                  actionModal.action === 'VERIFY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {hospitalAction.isPending ? 'Processing…' : actionModal.action === 'VERIFY' ? 'Verify Hospital' : 'Suspend Hospital'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
