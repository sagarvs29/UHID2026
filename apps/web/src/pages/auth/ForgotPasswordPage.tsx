import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword, getErrorMessage } from '@/hooks/useAuth';
import { Activity, CheckCircle2, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setSubmittedEmail(data.email);
    forgot.mutate(data.email, { onSuccess: () => setSent(true) });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-md">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">UHID Health</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Forgot your password?</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          {sent ? (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  If <span className="font-medium text-foreground">{submittedEmail}</span> is
                  registered, a password reset link has been sent.
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground text-left">
                <p className="font-medium text-foreground mb-1">Didn&apos;t receive it?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check your spam / junk folder</li>
                  <li>The link is valid for 1 hour</li>
                  <li>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => { setSent(false); setSubmittedEmail(''); }}
                    >
                      Try a different email
                    </button>
                  </li>
                </ul>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Reset password</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              {forgot.isError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(forgot.error)}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email address</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={forgot.isPending}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {forgot.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />Sending…
                    </span>
                  ) : 'Send reset link'}
                </button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            </div>
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

