import { useState } from 'react';
import {
  usePendingVerifications,
  useVerifyStaff,
  useActiveStaff,
  useDeactivateStaff,
} from '@/hooks/useAdmin';
import type { PendingMember, ActiveDoctor, ActiveStaffMember } from '@/types/admin';
import { UserCheck, UserX, UserMinus, Search, Stethoscope, Users } from 'lucide-react';

type Tab = 'pending' | 'active';

// ─── Verify Modal ─────────────────────────────────────────────────────────────

interface VerifyModalProps {
  member:    PendingMember;
  action:    'VERIFY' | 'REJECT';
  onClose:   () => void;
  onConfirm: (notes?: string) => void;
  isPending: boolean;
}

function VerifyModal({ member, action, onClose, onConfirm, isPending }: VerifyModalProps) {
  const [notes, setNotes] = useState('');
  const needsNotes = action === 'REJECT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" data-testid="verify-modal">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          {action === 'VERIFY' ? 'Verify' : 'Reject'} — {member.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {action === 'VERIFY'
            ? 'This will mark the member as verified and allow them to use the platform.'
            : 'Please provide a reason for rejection (required).'}
        </p>
        {needsNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for rejection (min 10 characters)…"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(needsNotes ? notes : undefined)}
            disabled={isPending || (needsNotes && notes.trim().length < 10)}
            className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
              action === 'VERIFY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isPending ? 'Processing…' : action === 'VERIFY' ? 'Verify' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deactivate Modal ─────────────────────────────────────────────────────────

interface DeactivateModalProps {
  name:      string;
  userId:    string;
  onClose:   () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

function DeactivateModal({ name, onClose, onConfirm, isPending }: DeactivateModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" data-testid="deactivate-modal">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Deactivate — {name}</h2>
        <p className="text-sm text-muted-foreground">
          This will prevent the user from logging in. Provide a reason (required).
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for deactivation (min 10 characters)…"
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending || reason.trim().length < 10}
            data-testid="confirm-deactivate-btn"
            className="px-4 py-2 text-sm rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [tab,    setTab]    = useState<Tab>('pending');
  const [search, setSearch] = useState('');

  const [verifyTarget, setVerifyTarget] = useState<{ member: PendingMember; action: 'VERIFY' | 'REJECT' } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{ userId: string; name: string } | null>(null);

  const { data: pending = [], isLoading: pendingLoading } = usePendingVerifications();
  const { data: activeStaff,  isLoading: activeLoading  } = useActiveStaff();
  const verifyMut     = useVerifyStaff();
  const deactivateMut = useDeactivateStaff();

  const doctors: ActiveDoctor[]      = activeStaff?.doctors ?? [];
  const staff:   ActiveStaffMember[] = activeStaff?.staff   ?? [];

  const lc = search.toLowerCase();
  const filteredDoctors = doctors.filter(
    (d) => d.name.toLowerCase().includes(lc) || d.specialty?.toLowerCase().includes(lc)
  );
  const filteredStaff = staff.filter(
    (s) => s.name.toLowerCase().includes(lc) || s.staffType?.toLowerCase().includes(lc)
  );

  const handleVerifyConfirm = (notes?: string) => {
    if (!verifyTarget) return;
    verifyMut.mutate(
      { userId: verifyTarget.member.id, input: { action: verifyTarget.action, notes } },
      { onSuccess: () => setVerifyTarget(null) }
    );
  };

  const handleDeactivateConfirm = (reason: string) => {
    if (!deactivateTarget) return;
    deactivateMut.mutate(
      { userId: deactivateTarget.userId, reason },
      { onSuccess: () => setDeactivateTarget(null) }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verify new members and manage active doctors & staff in your hospital.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b">
        <button
          data-testid="tab-pending"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending
          {pending.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          data-testid="tab-active"
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Staff
        </button>
      </div>

      {/* ── Pending Tab ── */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingLoading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!pendingLoading && pending.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No pending verifications — all caught up ✓
            </div>
          )}
          {pending.map((member) => (
            <div
              key={member.id}
              data-testid="pending-card"
              className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  {member.role === 'DOCTOR' ? (
                    <Stethoscope className="w-4 h-4 text-primary" />
                  ) : (
                    <Users className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">{member.name}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {member.role === 'DOCTOR' ? 'Doctor' : member.staffType ?? 'Staff'}
                  </span>
                </div>
                {member.specialty && (
                  <p className="text-xs text-muted-foreground">Specialty: {member.specialty}</p>
                )}
                {member.licenseNumber && (
                  <p className="text-xs text-muted-foreground">License: {member.licenseNumber}</p>
                )}
                {member.employeeId && (
                  <p className="text-xs text-muted-foreground">Employee ID: {member.employeeId}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registered: {new Date(member.registeredAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  data-testid="verify-btn"
                  onClick={() => setVerifyTarget({ member, action: 'VERIFY' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Verify
                </button>
                <button
                  data-testid="reject-btn"
                  onClick={() => setVerifyTarget({ member, action: 'REJECT' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active Tab ── */}
      {tab === 'active' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-testid="staff-search"
              type="text"
              placeholder="Search by name or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {activeLoading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!activeLoading && filteredDoctors.length === 0 && filteredStaff.length === 0 && (
            <p className="text-center py-10 text-sm text-muted-foreground">No active staff found.</p>
          )}

          {/* Doctors table */}
          {filteredDoctors.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doctors</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-xs">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Specialty</th>
                    <th className="text-left px-4 py-2 font-medium">License</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doc) => (
                    <tr
                      key={doc.userId}
                      data-testid="active-staff-row"
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{doc.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.specialty ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{doc.licenseNumber}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          data-testid="deactivate-btn"
                          onClick={() => setDeactivateTarget({ userId: doc.userId, name: doc.name })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
                        >
                          <UserMinus className="w-3 h-3" />
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Staff table */}
          {filteredStaff.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hospital Staff</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-xs">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Employee ID</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => (
                    <tr
                      key={s.userId}
                      data-testid="active-staff-row"
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.staffType ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.employeeId ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          data-testid="deactivate-btn"
                          onClick={() => setDeactivateTarget({ userId: s.userId, name: s.name })}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
                        >
                          <UserMinus className="w-3 h-3" />
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {verifyTarget && (
        <VerifyModal
          member={verifyTarget.member}
          action={verifyTarget.action}
          onClose={() => setVerifyTarget(null)}
          onConfirm={handleVerifyConfirm}
          isPending={verifyMut.isPending}
        />
      )}
      {deactivateTarget && (
        <DeactivateModal
          name={deactivateTarget.name}
          userId={deactivateTarget.userId}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleDeactivateConfirm}
          isPending={deactivateMut.isPending}
        />
      )}
    </div>
  );
}
