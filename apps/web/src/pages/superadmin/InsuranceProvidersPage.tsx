import { useState } from 'react';
import { useHospitalList, useHospitalAction } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Landmark,
  Search,
  BadgeCheck,
  XCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface InsuranceProvider {
  id: string;
  companyName: string;
  licenseNumber: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function InsuranceProvidersPage() {
  const [search, setSearch] = useState('');

  // Use audit logs to derive insurance provider activity
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', { actorRole: 'INSURANCE_PROVIDER', limit: 100 }],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { logs: Array<{ actorId: string; actorRole: string; action: string; createdAt: string; metadata: Record<string, unknown> | null }> } }>(
        '/admin/audit-logs?actorRole=INSURANCE_PROVIDER&limit=100',
      );
      return res.data.data;
    },
  });

  // Derive unique insurance providers
  const providerMap = new Map<string, { id: string; lastActivity: string; actions: number }>();
  auditData?.logs?.forEach((log) => {
    const existing = providerMap.get(log.actorId);
    if (existing) {
      existing.actions++;
    } else {
      providerMap.set(log.actorId, {
        id: log.actorId,
        lastActivity: log.createdAt,
        actions: 1,
      });
    }
  });

  const providers = Array.from(providerMap.values())
    .filter((p) => (search ? p.id.toLowerCase().includes(search.toLowerCase()) : true));

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
          <Landmark className="w-6 h-6 text-primary" />
          Insurance Providers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage registered insurance providers and their platform activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Active Providers</p>
          <p className="text-2xl font-bold text-foreground">{providerMap.size}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Activities</p>
          <p className="text-2xl font-bold text-foreground">{auditData?.logs?.length ?? 0}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by provider ID…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Providers table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-3 font-medium">Provider ID</th>
                <th className="text-center px-4 py-3 font-medium">Total Actions</th>
                <th className="text-left px-4 py-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-muted-foreground text-sm">
                    No insurance provider activity found
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{p.id.slice(0, 16)}…</td>
                    <td className="px-4 py-2.5 text-center font-semibold">{p.actions}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.lastActivity).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Provider verification happens during registration</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Insurance providers are verified during the registration process. This page shows active providers
            and their claim activity on the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
