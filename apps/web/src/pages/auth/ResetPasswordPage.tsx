import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword, getErrorMessage } from '@/hooks/useAuth';
import { Activity, Eye, EyeOff, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormData = z.infer<typeof schema>;

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors pr-10';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reset = useResetPassword();
  const token = params.get('token') ?? '';
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    reset.mutate({ token, newPassword: data.newPassword, confirmPassword: data.confirmPassword });
  };

  /* ── No token ──────────────────────────────────────── */
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center bg-card border rounded-2xl shadow-sm px-8 py-10 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Invalid Reset Link</h2>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ───────────────────────────────────────── */
  if (reset.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center bg-card border rounded-2xl shadow-sm px-8 py-10 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Password Reset!</h2>
          <p className="text-sm text-muted-foreground">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
          <p className="text-xs text-muted-foreground pt-2 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured with 256-bit encryption · HIPAA compliant
          </p>
        </div>
      </div>
    );
  }

  /* ── Form ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-1">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">UHID Health</h1>
          <p className="text-sm text-muted-foreground">Universal Health Identity Platform</p>
        </div>

        {/* Card */}
        <div className="bg-card border rounded-2xl shadow-sm px-8 py-8 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Set new password</h2>
            <p className="text-sm text-muted-foreground">
              Choose a strong password. It cannot be reused.
            </p>
          </div>

          {/* Error banner */}
          {reset.isError && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{getErrorMessage(reset.error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min. 8 chars, upper, lower, number, symbol"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Password rules hint */}
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
              <li>• At least 8 characters</li>
              <li>• One uppercase &amp; one lowercase letter</li>
              <li>• One number and one special character (@$!%*?&amp;)</li>
            </ul>

            <button
              type="submit"
              disabled={reset.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {reset.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
