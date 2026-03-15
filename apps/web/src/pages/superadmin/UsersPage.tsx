import { useState } from 'react';
import { usePlatformAnalytics } from '@/hooks/useAdmin';
import {
  Globe,
  Search,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface PlatformUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  PATIENT:            'bg-blue-100 text-blue-700',
  DOCTOR:             'bg-emerald-100 text-emerald-700',
  HOSPITAL_STAFF:     'bg-amber-100 text-amber-700',
  HOSPITAL_ADMIN:     'bg-violet-100 text-violet-700',
  INSURANCE_PROVIDER: 'bg-orange-100 text-orange-700',
  SUPER_ADMIN:        'bg-red-100 text-red-700',
};

const ROLE_LABELS: Record<string, string> = {
  PATIENT:            'Patient',
  DOCTOR:             'Doctor',
  HOSPITAL_STAFF:     'Staff',
  HOSPITAL_ADMIN:     'Admin',
  INSURANCE_PROVIDER: 'Insurance',
  SUPER_ADMIN:        'Super Admin',
};

export default function UsersPage() {
  const { data: analytics } = usePlatformAnalytics();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // We'll use the audit logs endpoint to list users since there's no dedicated user-list API
  // For now show the analytics breakdown
  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-logs', { limit: 100 }],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { logs: Array<{ actorId: string; actorRole: string; createdAt: string }> } }>(
        '/admin/audit-logs?limit=100',
      );
      return res.data.data;
    },
  });

  // Derive unique users from audit logs as a proxy list
  const uniqueUsers = new Map<string, { id: string; role: string; lastSeen: string }>();
  auditData?.logs?.forEach((log) => {
    if (!uniqueUsers.has(log.actorId)) {
      uniqueUsers.set(log.actorId, {
        id: log.actorId,
        role: log.actorRole,
        lastSeen: log.createdAt,
      });
    }
  });

  const userList = Array.from(uniqueUsers.values())
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter((u) => (search ? u.id.toLowerCase().includes(search.toLowerCase()) : true));

  const roles = Object.entries(analytics?.users.byRole ?? {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          All Users
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide user overview across all roles and hospitals.
        </p>
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {roles.map(([role, count]) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              roleFilter === role ? 'ring-2 ring-primary bg-primary/5' : 'bg-card hover:bg-muted/40'
            }`}
          >
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}>
              {ROLE_LABELS[role] ?? role}
            </span>
            <p className="text-xl font-bold text-foreground mt-1">{(count as number).toLocaleString()}</p>
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total Platform Users</p>
          <p className="text-3xl font-bold text-foreground">{analytics?.users.total.toLocaleString() ?? '—'}</p>
        </div>
        <Shield className="w-10 h-10 text-primary/20" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user ID…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* User activity table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Recent Active Users (from Audit Logs)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-2 font-medium">User ID</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-muted-foreground text-sm">
                    No user activity found
                  </td>
                </tr>
              ) : (
                userList.slice(0, 50).map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{u.id.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[u.role] ?? 'bg-gray-100'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(u.lastSeen).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
