import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import {
  Settings,
  Shield,
  Key,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [enforceTotp, setEnforceTotp] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipAllowlist, setIpAllowlist] = useState(false);

  const ToggleButton = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="text-primary">
      {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Security Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage access policies and security configuration for your hospital.
        </p>
      </div>

      {/* Access control */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Access Control
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Require TOTP for all staff members</p>
            </div>
            <ToggleButton enabled={enforceTotp} onToggle={() => setEnforceTotp(!enforceTotp)} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">IP Allowlist</p>
              <p className="text-xs text-muted-foreground">Restrict access to specific IP ranges</p>
            </div>
            <ToggleButton enabled={ipAllowlist} onToggle={() => setIpAllowlist(!ipAllowlist)} />
          </div>
        </div>
      </div>

      {/* Session config */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          Session Management
        </h3>
        <div className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Session Timeout</p>
            <p className="text-xs text-muted-foreground">Idle timeout before auto-logout (minutes)</p>
          </div>
          <select
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="120">2 hours</option>
          </select>
        </div>
      </div>

      {/* Admin info */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Current Admin</h3>
        <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Settings are currently display-only</p>
          <p className="text-xs text-blue-600 mt-0.5">
            The backend API for persisting security settings will be added in a future update.
            All changes here are visual previews.
          </p>
        </div>
      </div>
    </div>
  );
}
