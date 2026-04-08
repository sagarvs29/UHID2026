import { useState } from 'react';
import { useHospitalList, useHospitalAction, useCreateHospital, useDeleteHospital } from '@/hooks/useAdmin';
import type { CreateHospitalInput } from '@/hooks/useAdmin';
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
  Plus,
  X,
  Trash2,
} from 'lucide-react';

export default function HospitalsPage() {
  const { data: hospitals = [], isLoading } = useHospitalList();
  const hospitalAction = useHospitalAction();
  const createHospital = useCreateHospital();
  const deleteHospital = useDeleteHospital();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [actionModal, setActionModal] = useState<{
    hospital: typeof hospitals[0];
    action: 'VERIFY' | 'SUSPEND';
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<typeof hospitals[0] | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [notes, setNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateHospitalInput>({
    name: '', registrationNumber: '', address: '', city: '', state: '', pincode: '',
    phone: '', email: '', isNABH: false, specialties: [],
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
  });
  const [createError, setCreateError] = useState('');

  const handleDelete = () => {
    if (!deleteModal) return;
    deleteHospital.mutate(deleteModal.id, {
      onSuccess: () => { setDeleteModal(null); setDeleteConfirmName(''); },
    });
  };

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

  const handleCreateHospital = () => {
    setCreateError('');
    const f = createForm;

    // Required fields check
    if (!f.name.trim() || !f.registrationNumber.trim() || !f.address.trim() ||
        !f.city.trim() || !f.state.trim() || !f.pincode.trim()) {
      setCreateError('Please fill all required fields');
      return;
    }

    // Name length
    if (f.name.trim().length < 2 || f.name.trim().length > 200) {
      setCreateError('Hospital name must be 2–200 characters');
      return;
    }

    // Registration number format
    if (!/^[A-Za-z0-9\-/]+$/.test(f.registrationNumber.trim())) {
      setCreateError('Registration number: only letters, numbers, hyphens, slashes');
      return;
    }
    if (f.registrationNumber.trim().length > 50) {
      setCreateError('Registration number too long (max 50)');
      return;
    }

    // Address length
    if (f.address.trim().length < 5 || f.address.trim().length > 500) {
      setCreateError('Address must be 5–500 characters');
      return;
    }

    // City: letters only
    if (!/^[A-Za-z\s\-.]+$/.test(f.city.trim())) {
      setCreateError('City must contain only letters');
      return;
    }

    // State: letters only
    if (!/^[A-Za-z\s\-.]+$/.test(f.state.trim())) {
      setCreateError('State must contain only letters');
      return;
    }

    // Pincode: exactly 6 digits
    if (!/^\d{6}$/.test(f.pincode)) {
      setCreateError('Pincode must be exactly 6 digits');
      return;
    }

    // Phone: optional, but if filled must be valid Indian mobile
    if (f.phone && f.phone.trim() !== '' && !/^[6-9]\d{9}$/.test(f.phone.trim())) {
      setCreateError('Phone must be a valid 10-digit Indian mobile (starts 6-9)');
      return;
    }

    // Email: optional, but if filled must be valid
    if (f.email && f.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) {
        setCreateError('Please enter a valid hospital email address');
        return;
      }
    }

    // ─── Admin fields validation ──────────────────────────────
    if (!f.adminFirstName.trim() || !f.adminLastName.trim() || !f.adminEmail.trim() || !f.adminPhone.trim()) {
      setCreateError('Please fill all Hospital Admin fields');
      return;
    }

    if (!/^[A-Za-z\s\-.]+$/.test(f.adminFirstName.trim()) || !/^[A-Za-z\s\-.]+$/.test(f.adminLastName.trim())) {
      setCreateError('Admin name must contain only letters');
      return;
    }

    const adminEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmailRegex.test(f.adminEmail.trim())) {
      setCreateError('Please enter a valid admin email address');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(f.adminPhone.trim())) {
      setCreateError('Admin phone must be a valid 10-digit Indian mobile (starts 6-9)');
      return;
    }

    createHospital.mutate(createForm, {
      onSuccess: () => {
        setShowCreateModal(false);
        setCreateForm({ name: '', registrationNumber: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', isNABH: false, specialties: [], adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '' });
        setCreateError('');
      },
      onError: (err) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create hospital';
        setCreateError(msg);
      },
    });
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Hospital className="w-6 h-6 text-primary" />
            Hospital Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, verify, suspend, or manage all hospitals on the UHID platform.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Hospital
        </button>
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
                        <button
                          onClick={() => { setDeleteModal(h); setDeleteConfirmName(''); }}
                          className="px-2 py-1 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete hospital permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Delete Hospital</h2>
                <p className="text-xs text-muted-foreground">{deleteModal.name}</p>
              </div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
              <p className="font-semibold">This action is permanent and cannot be undone.</p>
              <p>All doctors, staff, appointments, medical records, and audit logs for this hospital will be permanently erased from the database.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Type the hospital name to confirm: <span className="font-bold">{deleteModal.name}</span>
              </label>
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deleteModal.name}
                className="w-full mt-2 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setDeleteModal(null); setDeleteConfirmName(''); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteHospital.isPending || deleteConfirmName !== deleteModal.name}
                className="px-4 py-2 text-sm rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteHospital.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Hospital modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add New Hospital
              </h2>
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Hospital will be auto-verified. Doctors and staff can register under it immediately.
            </p>

            {createError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {createError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Hospital Name *</label>
                <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Apollo Hospital Chennai" maxLength={200}
                  className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Registration Number *</label>
                <input value={createForm.registrationNumber} onChange={(e) => setCreateForm((f) => ({ ...f, registrationNumber: e.target.value.replace(/[^A-Za-z0-9\-/]/g, '') }))}
                  placeholder="e.g. REG-MH-2024-0001" maxLength={50}
                  className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Address *</label>
                <textarea value={createForm.address} onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address" rows={2} maxLength={500}
                  className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">City *</label>
                  <input value={createForm.city} onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value.replace(/[^A-Za-z\s\-.]/g, '') }))}
                    placeholder="Chennai" maxLength={100}
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">State *</label>
                  <input value={createForm.state} onChange={(e) => setCreateForm((f) => ({ ...f, state: e.target.value.replace(/[^A-Za-z\s\-.]/g, '') }))}
                    placeholder="Tamil Nadu" maxLength={100}
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Pincode *</label>
                  <input value={createForm.pincode} onChange={(e) => setCreateForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
                    placeholder="600001" maxLength={6} inputMode="numeric" pattern="\d{6}"
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="9876543210" type="tel" maxLength={10} inputMode="numeric" pattern="[6-9]\d{9}"
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <p className="text-xs text-muted-foreground mt-1">10-digit Indian mobile (starts 6-9)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="info@hospital.com" type="email" maxLength={150}
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={createForm.isNABH}
                    onChange={(e) => setCreateForm((f) => ({ ...f, isNABH: e.target.checked }))}
                    className="rounded border-gray-300" />
                  <span className="text-sm font-medium text-foreground">NABH Accredited</span>
                </label>
              </div>

              {/* Hospital Admin Section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <UserCog className="w-4 h-4 text-primary" />
                  Hospital Admin Credentials
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  An admin account will be created and login credentials will be emailed to this person.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">First Name *</label>
                    <input value={createForm.adminFirstName} onChange={(e) => setCreateForm((f) => ({ ...f, adminFirstName: e.target.value.replace(/[^A-Za-z\s\-.]/g, '') }))}
                      placeholder="Rajesh" maxLength={80}
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Last Name *</label>
                    <input value={createForm.adminLastName} onChange={(e) => setCreateForm((f) => ({ ...f, adminLastName: e.target.value.replace(/[^A-Za-z\s\-.]/g, '') }))}
                      placeholder="Kumar" maxLength={80}
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Admin Email *</label>
                    <input value={createForm.adminEmail} onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                      placeholder="admin@hospital.com" type="email" maxLength={150}
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <p className="text-xs text-muted-foreground mt-1">Login credentials will be sent here</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Admin Phone *</label>
                    <input value={createForm.adminPhone} onChange={(e) => setCreateForm((f) => ({ ...f, adminPhone: e.target.value.replace(/\D/g, '') }))}
                      placeholder="9876543210" type="tel" maxLength={10} inputMode="numeric"
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <p className="text-xs text-muted-foreground mt-1">10-digit Indian mobile</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateHospital}
                disabled={createHospital.isPending}
                className="px-4 py-2 text-sm rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createHospital.isPending ? 'Creating…' : 'Create Hospital'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
