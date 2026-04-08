import { useState } from 'react';
import { usePatientList, useDeletePatient } from '@/hooks/useAdmin';
import {
  Users,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  XCircle,
  Calendar,
  FileText,
} from 'lucide-react';

const GENDER_LABELS: Record<string, string> = {
  MALE:             'Male',
  FEMALE:           'Female',
  OTHER:            'Other',
  PREFER_NOT_TO_SAY: 'N/A',
};

export default function PatientsPage() {
  const [search, setSearch]                       = useState('');
  const [debouncedSearch, setDebouncedSearch]     = useState('');
  const [page, setPage]                           = useState(1);
  const [deleteModal, setDeleteModal]             = useState<{ userId: string; name: string; uhid: string } | null>(null);
  const [deleteConfirmUhid, setDeleteConfirmUhid] = useState('');

  const { data, isLoading } = usePatientList(debouncedSearch || undefined, page, 20);
  const deletePatient = useDeletePatient();

  const patients    = data?.patients ?? [];
  const totalPages  = data?.totalPages ?? 1;
  const total       = data?.total ?? 0;

  // Simple debounce on search
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__patientSearchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__patientSearchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const handleDelete = () => {
    if (!deleteModal) return;
    deletePatient.mutate(deleteModal.userId, {
      onSuccess: () => { setDeleteModal(null); setDeleteConfirmUhid(''); },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Patient Accounts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and permanently delete patient accounts and all associated data.
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-xl border bg-card px-4 py-3 inline-block">
        <p className="text-xs text-muted-foreground">Total Patients</p>
        <p className="text-2xl font-bold text-foreground">{total}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, UHID, or email…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-3 font-medium">Patient</th>
                <th className="text-left px-4 py-3 font-medium">UHID</th>
                <th className="text-left px-4 py-3 font-medium">Gender</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Records</th>
                <th className="text-center px-4 py-3 font-medium">Appointments</th>
                <th className="text-left px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.userId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground">{p.uhid}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {GENDER_LABELS[p.gender] ?? p.gender}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          p.isActive ? 'text-green-700' : 'text-red-600'
                        }`}>
                          {p.isActive
                            ? <><BadgeCheck className="w-3 h-3" /> Active</>
                            : <><XCircle className="w-3 h-3" /> Inactive</>}
                        </span>
                        {!p.isEmailVerified && (
                          <span className="text-[10px] text-amber-600">Email unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" /> {p.recordCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {p.appointmentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setDeleteModal({ userId: p.userId, name: p.name, uhid: p.uhid }); setDeleteConfirmUhid(''); }}
                        className="px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete patient permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} — {total} patients total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Delete Patient Account</h2>
                <p className="text-xs text-muted-foreground">{deleteModal.name} · {deleteModal.uhid}</p>
              </div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
              <p className="font-semibold">This action is permanent and cannot be undone.</p>
              <p>All medical records, prescriptions, appointments, consents, QR codes, insurance claims, and the patient account will be permanently erased.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Type the patient UHID to confirm: <span className="font-bold font-mono">{deleteModal.uhid}</span>
              </label>
              <input
                value={deleteConfirmUhid}
                onChange={(e) => setDeleteConfirmUhid(e.target.value)}
                placeholder={deleteModal.uhid}
                className="w-full mt-2 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setDeleteModal(null); setDeleteConfirmUhid(''); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePatient.isPending || deleteConfirmUhid !== deleteModal.uhid}
                className="px-4 py-2 text-sm rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletePatient.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
