import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import {
  Settings,
  Shield,
  Bell,
  Globe,
  Clock,
  Save,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  // Local toggle state (visual only — no API yet)
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [enforceTotp, setEnforceTotp] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [rateLimiting, setRateLimiting] = useState(true);

  const ToggleButton = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="text-primary">
      {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
    </button>
  );

  const settingGroups = [
    {
      title: 'Security',
      icon: Shield,
      items: [
        {
          label: 'Enforce TOTP for Admins',
          desc: 'Require two-factor authentication for all admin roles',
          enabled: enforceTotp,
          toggle: () => setEnforceTotp(!enforceTotp),
        },
        {
          label: 'API Rate Limiting',
          desc: 'Enable rate limiting on public API endpoints (recommended)',
          enabled: rateLimiting,
          toggle: () => setRateLimiting(!rateLimiting),
        },
      ],
    },
    {
      title: 'Platform',
      icon: Globe,
      items: [
        {
          label: 'Maintenance Mode',
          desc: 'Temporarily disable all user access except Super Admin',
          enabled: maintenanceMode,
          toggle: () => setMaintenanceMode(!maintenanceMode),
        },
        {
          label: 'Email Notifications',
          desc: 'Send email alerts for critical platform events',
          enabled: emailNotifications,
          toggle: () => setEmailNotifications(!emailNotifications),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration, security policies, and feature flags.
        </p>
      </div>

      {/* Platform info */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Platform Information
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Platform', value: 'UHID — UniHealth ID' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Environment', value: 'Development' },
            { label: 'Admin', value: user?.email ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings groups */}
      {settingGroups.map(({ title, icon: Icon, items }) => (
        <div key={title} className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <div className="space-y-3">
            {items.map(({ label, desc, enabled, toggle }) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ToggleButton enabled={enabled} onToggle={toggle} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Settings are currently display-only</p>
          <p className="text-xs text-blue-600 mt-0.5">
            The backend API for persisting platform settings will be added in a future update.
            Toggle switches here are visual previews of the upcoming feature.
          </p>
        </div>
      </div>
    </div>
  );
}
