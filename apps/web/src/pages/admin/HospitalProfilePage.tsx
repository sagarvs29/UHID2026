import { useAuthStore } from '@/stores/auth.store';
import {
  Hospital,
  MapPin,
  Phone,
  Mail,
  Shield,
  Info,
  BadgeCheck,
} from 'lucide-react';

export default function HospitalProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Hospital className="w-6 h-6 text-primary" />
          Hospital Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your hospital's information and verification status.
        </p>
      </div>

      {/* Hospital card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary via-[hsl(193,80%,40%)] to-primary/40" />
        <div className="px-6 pb-6 -mt-8">
          <div className="w-16 h-16 rounded-full bg-background border-4 border-background flex items-center justify-center">
            <Hospital className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-bold text-foreground">Your Hospital</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Managed by {user?.name} ({user?.email})
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Hospital Information</h3>
        <div className="space-y-3">
          {[
            { icon: Hospital, label: 'Hospital Name', value: 'Set during registration' },
            { icon: MapPin, label: 'Location', value: 'City, State' },
            { icon: Shield, label: 'NABH Status', value: 'Pending verification' },
            { icon: Mail, label: 'Admin Contact', value: user?.email ?? '—' },
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

      {/* Verification status */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary" />
          Verification Status
        </h3>
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <BadgeCheck className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">Hospital Verified</p>
            <p className="text-xs text-green-600">
              Your hospital has been verified by the UHID Super Admin. You can onboard doctors and staff.
            </p>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Profile editing coming soon</p>
          <p className="text-xs text-blue-600 mt-0.5">
            The ability to update hospital details, departments, and contact information will be available
            in a future update. Contact the Super Admin for changes.
          </p>
        </div>
      </div>
    </div>
  );
}
