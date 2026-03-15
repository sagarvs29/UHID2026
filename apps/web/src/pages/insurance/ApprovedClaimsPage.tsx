import { useInsuranceClaims } from '@/hooks/useInsurance';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  IndianRupee,
} from 'lucide-react';

export default function ApprovedClaimsPage() {
  const navigate = useNavigate();
  const { data: approvedData, isLoading: loadingApproved } = useInsuranceClaims({ status: 'APPROVED' });
  const { data: paidData, isLoading: loadingPaid } = useInsuranceClaims({ status: 'PAID' });

  const approvedClaims = approvedData?.claims ?? [];
  const paidClaims = paidData?.claims ?? [];
  const allClaims = [...approvedClaims, ...paidClaims];

  const totalAmount = allClaims.reduce((sum: number, c: any) => sum + (c.totalAmount ?? 0), 0);

  if (loadingApproved || loadingPaid) {
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
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          Approved Claims
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Claims that have been approved or paid out.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approvedClaims.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold text-emerald-600">{paidClaims.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold text-foreground flex items-center gap-1">
            <IndianRupee className="w-5 h-5" />
            {totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Claims list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30 text-xs">
                <th className="text-left px-4 py-3 font-medium">Claim ID</th>
                <th className="text-left px-4 py-3 font-medium">Patient</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    No approved claims yet
                  </td>
                </tr>
              ) : (
                allClaims.map((claim: any) => (
                  <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{claim.id?.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{claim.patientId?.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        claim.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">₹{claim.totalAmount?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => navigate(`/insurance/claims/${claim.id}`)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </button>
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
