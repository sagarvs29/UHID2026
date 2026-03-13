import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVerifyEmail, getErrorMessage } from '@/hooks/useAuth';
import { Activity, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();

  useEffect(() => {
    if (token && verifyEmail.isIdle) {
      verifyEmail.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-md">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">UHID Health</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 text-center space-y-5">
          {/* Loading */}
          {verifyEmail.isPending && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Verifying your email…</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Please wait a moment.</p>
              </div>
            </>
          )}

          {/* Success */}
          {verifyEmail.isSuccess && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Email verified!</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Your account is now active. Sign in to access your dashboard.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign in now
              </Link>
            </>
          )}

          {/* Error */}
          {verifyEmail.isError && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-destructive" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Verification failed</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {getErrorMessage(verifyEmail.error)}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The link may have expired (valid for 24 hours). Request a new one by signing in.
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Go to sign in
                </Link>
              </div>
            </>
          )}

          {/* No token */}
          {!token && !verifyEmail.isPending && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Invalid link</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  No verification token found in this link. Please use the link sent to your email.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secured with 256-bit encryption · HIPAA compliant</span>
        </div>
      </div>
    </div>
  );
}
