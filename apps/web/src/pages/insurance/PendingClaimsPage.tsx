import { useInsuranceClaims } from '@/hooks/useInsurance';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  AlertTriangle,
  ArrowRight,
  Calendar,
} from 'lucide-react';

export default function PendingClaimsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useInsuranceClaims({ status: 'SUBMITTED' });
  const { data: reviewData } = useInsuranceClaims({ status: 'UNDER_REVIEW' });

  const pendingClaims = data?.claims ?? [];
  const reviewClaims = reviewData?.claims ?? [];
  const allClaims = [...pendingClaims, ...reviewClaims];

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
          <Clock className="w-6 h-6 text-primary" />
          Pending Claims
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Claims awaiting review or currently under review.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-2xl font-bold text-amber-600">{pendingClaims.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Under Review</p>
          <p className="text-2xl font-bold text-blue-600">{reviewClaims.length}</p>
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
                <th className="text-left px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    No pending claims
                  </td>
                </tr>
              ) : (
                allClaims.map((claim: any) => (
                  <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{claim.id?.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{claim.patientId?.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        claim.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
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
                        Review <ArrowRight className="w-3 h-3" />
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
