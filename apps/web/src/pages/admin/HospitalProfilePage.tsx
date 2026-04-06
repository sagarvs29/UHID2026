import { useMyProfile } from '@/hooks/useProfile';
import { useHospitalAnalytics } from '@/hooks/useAdmin';
import {
  Hospital,
  MapPin,
  Mail,
  Phone,
  Shield,
  BadgeCheck,
  Users,
  UserCog,
  FileText,
  Activity,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function HospitalProfilePage() {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: analytics, isLoading: analyticsLoading } = useHospitalAnalytics();

  const isLoading = profileLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = profile?.user;
  const hospitalProfile = profile?.profile as Record<string, unknown> | null;

  // Extract hospital info from the profile/analytics data
  const hospitalName = (hospitalProfile?.hospitalName as string) ?? (analytics as any)?.hospitalName ?? 'Your Hospital';
  const hospitalCity = (hospitalProfile?.hospitalCity as string) ?? '';
  const hospitalState = (hospitalProfile?.hospitalState as string) ?? '';
  const location = [hospitalCity, hospitalState].filter(Boolean).join(', ') || 'Location not set';
  const isVerified = (hospitalProfile?.hospitalVerified as boolean) ?? true;
  const isNABH = (hospitalProfile?.isNABH as boolean) ?? false;
  const registrationNumber = (hospitalProfile?.registrationNumber as string) ?? '';
  const hospitalPhone = (hospitalProfile?.hospitalPhone as string) ?? '';
  const hospitalEmail = (hospitalProfile?.hospitalEmail as string) ?? '';

  const staffCount = (analytics as any)?.totalStaff ?? (analytics as any)?.staffCount ?? 0;
  const doctorCount = (analytics as any)?.totalDoctors ?? (analytics as any)?.doctorCount ?? 0;
  const totalPatients = analytics?.totalPatients ?? 0;
  const totalRecords = analytics?.recordsUploadedThisMonth ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Hospital className="w-6 h-6 text-primary" />
          Hospital Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your hospital's information, verification status, and team overview.
        </p>
      </div>

      {/* Hospital banner card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary via-[hsl(193,80%,40%)] to-primary/40 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        </div>
        <div className="px-6 pb-6 -mt-10 relative">
          <div className="w-20 h-20 rounded-2xl bg-background border-4 border-background shadow-lg flex items-center justify-center">
            <Hospital className="w-10 h-10 text-primary" />
          </div>
          <div className="mt-3 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{hospitalName}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </div>
              {registrationNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reg# {registrationNumber}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <Clock className="w-3.5 h-3.5" /> Pending Verification
                </span>
              )}
              {isNABH && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  NABH
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Doctors', value: doctorCount, icon: Users, color: 'text-blue-600' },
          { label: 'Staff', value: staffCount, icon: UserCog, color: 'text-violet-600' },
          { label: 'Patients', value: totalPatients, icon: Activity, color: 'text-emerald-600' },
          { label: 'Records (Month)', value: totalRecords, icon: FileText, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{(value as number).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Contact & details */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Hospital className="w-4 h-4 text-primary" />
          Hospital Details
        </h3>
        <div className="space-y-2">
          {[
            { icon: Hospital, label: 'Hospital Name', value: hospitalName },
            { icon: MapPin, label: 'Location', value: location },
            { icon: Mail, label: 'Hospital Email', value: hospitalEmail || user?.email || '—' },
            { icon: Phone, label: 'Phone', value: hospitalPhone || '—' },
            { icon: Shield, label: 'NABH Accredited', value: isNABH ? 'Yes' : 'No' },
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

      {/* Admin info */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-primary" />
          Hospital Administrator
        </h3>
        <div className="flex items-center gap-4 rounded-lg bg-muted/30 px-4 py-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {(profile?.profile as any)?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {[(profile?.profile as any)?.firstName, (profile?.profile as any)?.lastName].filter(Boolean).join(' ') || 'Administrator'}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Verification status */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary" />
          Verification Status
        </h3>
        {isVerified ? (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <BadgeCheck className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">Hospital Verified</p>
              <p className="text-xs text-green-600">
                Your hospital has been verified by the UHID Super Admin. Doctors and staff can register and operate under this hospital.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pending Verification</p>
              <p className="text-xs text-amber-600">
                Your hospital is awaiting verification by the UHID Super Admin. Doctors and staff cannot onboard until verification is complete.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
