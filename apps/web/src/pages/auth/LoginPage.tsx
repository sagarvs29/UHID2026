import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin, getErrorMessage } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

const ROLE_REDIRECT: Record<string, string> = {
  PATIENT: '/patient/dashboard',
  DOCTOR: '/doctor/dashboard',
  HOSPITAL_STAFF: '/staff/dashboard',
  HOSPITAL_ADMIN: '/admin/dashboard',
  INSURANCE_PROVIDER: '/insurance/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onSuccess: () => {
        const role = useAuthStore.getState().user?.role ?? '';
        const dest = ROLE_REDIRECT[role] ?? '/patient/dashboard';
        navigate(dest, { replace: true });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-md">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">UHID Health</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Unified Health Identity Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">

          <div>
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Enter your credentials to continue</p>
          </div>

          {/* Error */}
          {login.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {getErrorMessage(login.error)}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPass((p) => !p)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            New to UHID?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secured with 256-bit encryption · HIPAA compliant</span>
        </div>
      </div>
    </div>
  );
}
