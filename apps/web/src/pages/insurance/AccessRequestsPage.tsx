import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  Info,
  FileText,
  Lock,
} from 'lucide-react';

export default function AccessRequestsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Access Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request and manage patient data access for insurance claims processing.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Consent-based Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              All patient data access on the UHID platform is consent-gated. When you submit a claim,
              the system automatically verifies that you have the necessary consent to view the patient's
              medical records for claim processing.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">How Access Works for Claims</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Patient Grants Consent', desc: 'Patient must grant consent to the insurance provider via their consent page (OTP verified)' },
            { step: '2', title: 'Submit Claim', desc: 'When submitting a claim, the system checks for active consent for the patient' },
            { step: '3', title: 'Verify Records', desc: 'With active consent, you can verify the integrity of medical records attached to the claim' },
            { step: '4', title: 'Consent Expires', desc: 'Time-limited consents automatically expire. You\'ll need new consent for future claims' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/insurance/claims/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FileText className="w-4 h-4" /> Submit New Claim
        </button>
        <button
          onClick={() => navigate('/insurance/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Dedicated access request management coming soon
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            A full request/revoke UI where you can send consent requests to patients and track their status
            will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
