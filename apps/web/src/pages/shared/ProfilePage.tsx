import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useMyProfile, useUpdateProfile } from '@/hooks/useProfile';
import type { PatientProfileUpdate, DoctorProfileUpdate } from '@/hooks/useProfile';
import {
  User,
  Mail,
  Shield,
  Hash,
  Pencil,
  Save,
  X,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MapPin,
  Droplet,
  Heart,
  Activity,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  PATIENT:            'Patient',
  DOCTOR:             'Doctor',
  HOSPITAL_STAFF:     'Hospital Staff',
  HOSPITAL_ADMIN:     'Hospital Admin',
  INSURANCE_PROVIDER: 'Insurance Provider',
  SUPER_ADMIN:        'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT:            'bg-blue-100 text-blue-700',
  DOCTOR:             'bg-emerald-100 text-emerald-700',
  HOSPITAL_STAFF:     'bg-amber-100 text-amber-700',
  HOSPITAL_ADMIN:     'bg-violet-100 text-violet-700',
  INSURANCE_PROVIDER: 'bg-orange-100 text-orange-700',
  SUPER_ADMIN:        'bg-red-100 text-red-700',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;

// ─── Tag Input Component ──────────────────────────────────────────────────────

function TagInput({
  label,
  icon: Icon,
  tags,
  onChange,
  placeholder = 'Type and press Enter',
}: {
  label: string;
  icon: React.ElementType;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  }, [input, tags, onChange]);

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-lg bg-primary/10 px-3 py-2 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: meData, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Patient fields
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [bloodGroup, setBloodGroup]   = useState('');
  const [allergies, setAllergies]     = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [address, setAddress]         = useState('');
  const [city, setCity]               = useState('');
  const [state, setState]             = useState('');
  const [pincode, setPincode]         = useState('');

  // Doctor fields
  const [specialty, setSpecialty]             = useState('');
  const [qualifications, setQualifications]   = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);
  const [languages, setLanguages]             = useState<string[]>([]);

  const profile = meData?.profile ?? {};

  // Populate form from fetched profile
  useEffect(() => {
    if (!meData?.profile) return;
    const p = meData.profile;
    setFirstName((p.firstName as string) ?? '');
    setLastName((p.lastName as string) ?? '');
    setPhone((p.phone as string) ?? '');
    setBloodGroup((p.bloodGroup as string) ?? '');
    setAllergies((p.allergies as string[]) ?? []);
    setChronicConditions((p.chronicConditions as string[]) ?? []);
    setAddress((p.address as string) ?? '');
    setCity((p.city as string) ?? '');
    setState((p.state as string) ?? '');
    setPincode((p.pincode as string) ?? '');
    setSpecialty((p.specialty as string) ?? '');
    setQualifications((p.qualifications as string[]) ?? []);
    setExperienceYears((p.experienceYears as number) ?? 0);
    setConsultationFee((p.consultationFee as number) ?? 0);
    setLanguages((p.languages as string[]) ?? []);
  }, [meData]);

  const handleCancel = () => {
    setEditing(false);
    // Reset from fetched profile
    if (meData?.profile) {
      const p = meData.profile;
      setFirstName((p.firstName as string) ?? '');
      setLastName((p.lastName as string) ?? '');
      setPhone((p.phone as string) ?? '');
      setBloodGroup((p.bloodGroup as string) ?? '');
      setAllergies((p.allergies as string[]) ?? []);
      setChronicConditions((p.chronicConditions as string[]) ?? []);
      setAddress((p.address as string) ?? '');
      setCity((p.city as string) ?? '');
      setState((p.state as string) ?? '');
      setPincode((p.pincode as string) ?? '');
      setSpecialty((p.specialty as string) ?? '');
      setQualifications((p.qualifications as string[]) ?? []);
      setExperienceYears((p.experienceYears as number) ?? 0);
      setConsultationFee((p.consultationFee as number) ?? 0);
      setLanguages((p.languages as string[]) ?? []);
    }
  };

  const handleSave = () => {
    const role = user?.role;
    if (role === 'PATIENT') {
      const payload: PatientProfileUpdate = {
        firstName, lastName, phone, bloodGroup, allergies, chronicConditions,
        address, city, state, pincode,
      };
      updateProfile.mutate(payload, {
        onSuccess: () => {
          setEditing(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
      });
    } else if (role === 'DOCTOR') {
      const payload: DoctorProfileUpdate = {
        firstName, lastName, specialty, qualifications,
        experienceYears, consultationFee, languages,
      };
      updateProfile.mutate(payload, {
        onSuccess: () => {
          setEditing(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
      });
    }
  };

  const isPatient = user?.role === 'PATIENT';
  const isDoctor  = user?.role === 'DOCTOR';
  const canEdit   = isPatient || isDoctor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {editing ? 'Edit your personal information below.' : 'View your account information and settings.'}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">Profile updated successfully!</p>
        </div>
      )}

      {/* Error banner */}
      {updateProfile.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">
            {updateProfile.error?.message ?? 'Failed to update profile.'}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">Failed to load profile.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Profile card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary via-[hsl(193,80%,40%)] to-primary/40" />
            <div className="px-6 pb-6 -mt-8">
              <div className="w-16 h-16 rounded-full bg-background border-4 border-background flex items-center justify-center text-2xl font-bold text-primary">
                {(profile.firstName as string)?.charAt(0)?.toUpperCase() ?? user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="mt-3">
                <h2 className="text-xl font-bold text-foreground">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || user?.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user?.role ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account details (read-only) */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Account Information</h3>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: meData?.user?.email ?? user?.email ?? '—' },
                { icon: Shield, label: 'Role', value: ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—' },
                ...(isPatient && profile.uhid
                  ? [{ icon: Hash, label: 'UHID', value: profile.uhid as string }]
                  : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Editable personal details ─── */}
          {canEdit && (
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <h3 className="text-sm font-semibold text-foreground">
                {isPatient ? 'Personal & Health Details' : 'Professional Details'}
              </h3>

              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!editing}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!editing}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* ─── Patient-specific fields ─── */}
              {isPatient && (
                <>
                  {/* Phone & Blood Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <Droplet className="w-4 h-4 text-muted-foreground" />
                        Blood Group
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Allergies */}
                  {editing ? (
                    <TagInput
                      label="Allergies"
                      icon={AlertTriangle}
                      tags={allergies}
                      onChange={setAllergies}
                      placeholder="e.g. Peanuts, Penicillin"
                    />
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        Allergies
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allergies.length === 0 && <span className="text-sm text-muted-foreground">None listed</span>}
                        {allergies.map((a) => (
                          <span key={a} className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chronic Conditions */}
                  {editing ? (
                    <TagInput
                      label="Chronic Conditions"
                      icon={Heart}
                      tags={chronicConditions}
                      onChange={setChronicConditions}
                      placeholder="e.g. Diabetes, Hypertension"
                    />
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <Heart className="w-4 h-4 text-muted-foreground" />
                        Chronic Conditions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {chronicConditions.length === 0 && <span className="text-sm text-muted-foreground">None listed</span>}
                        {chronicConditions.map((c) => (
                          <span key={c} className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={!editing}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Pincode</label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ─── Doctor-specific fields ─── */}
              {isDoctor && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        Specialty
                      </label>
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Experience (years)</label>
                      <input
                        type="number"
                        min={0}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        disabled={!editing}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      disabled={!editing}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed sm:w-48"
                    />
                  </div>

                  {/* Qualifications */}
                  {editing ? (
                    <TagInput
                      label="Qualifications"
                      icon={Shield}
                      tags={qualifications}
                      onChange={setQualifications}
                      placeholder="e.g. MBBS, MD"
                    />
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        Qualifications
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {qualifications.length === 0 && <span className="text-sm text-muted-foreground">None listed</span>}
                        {qualifications.map((q) => (
                          <span key={q} className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {editing ? (
                    <TagInput
                      label="Languages"
                      icon={User}
                      tags={languages}
                      onChange={setLanguages}
                      placeholder="e.g. English, Hindi"
                    />
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Languages
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {languages.length === 0 && <span className="text-sm text-muted-foreground">None listed</span>}
                        {languages.map((l) => (
                          <span key={l} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Save / Cancel */}
              {editing && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 rounded-lg border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
