import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/hooks/useAuth';
import { Activity } from 'lucide-react';

const roles = [
  { value: 'PATIENT', label: 'Patient' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'HOSPITAL_STAFF', label: 'Hospital Staff' },
  { value: 'HOSPITAL_ADMIN', label: 'Hospital Admin' },
  { value: 'INSURANCE_PROVIDER', label: 'Insurance Provider' },
] as const;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must contain uppercase, lowercase, number and special character'
    ),
  role: z.enum(['PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'INSURANCE_PROVIDER']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PATIENT' },
  });

  const onSubmit = async (data: FormData) => {
    registerMutation.mutate(data, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-3">
            <Activity className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join UHID — your universal health ID</p>
        </div>

        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-5">
          {registerMutation.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {(registerMutation.error as { response?: { data?: { error?: string } } })
                ?.response?.data?.error ?? 'Registration failed'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'name' as const, label: 'Full Name', type: 'text', placeholder: 'Rahul Verma' },
              { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'phone' as const, label: 'Mobile Number', type: 'tel', placeholder: '9876543210' },
              { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{field.label}</label>
                <input
                  {...register(field.name)}
                  type={field.type}
                  placeholder={field.placeholder}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors[field.name] && (
                  <p className="text-xs text-destructive">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                {...register('role')}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || registerMutation.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {registerMutation.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
