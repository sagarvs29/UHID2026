import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity, Eye, EyeOff, CheckCircle2, ArrowLeft,
  Stethoscope, Building2, ShieldCheck, HeartPulse,
  ChevronRight, Loader2,
} from 'lucide-react';
import {
  useRegister, useHospitals, getErrorMessage,
  type RegisterRole,
} from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

// ─── Password schema ──────────────────────────────────────
const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'At least 8 characters')
  .max(128, 'Too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Must contain uppercase, lowercase, number and special character (@$!%*?&)'
  );

// ─── Roles config ─────────────────────────────────────────
const ROLES = [
  {
    value: 'patient' as RegisterRole,
    label: 'Patient',
    description: 'Manage your personal health records securely',
    icon: HeartPulse,
  },
  {
    value: 'doctor' as RegisterRole,
    label: 'Doctor',
    description: 'Access patient records with explicit consent',
    icon: Stethoscope,
  },
  {
    value: 'staff' as RegisterRole,
    label: 'Hospital Staff',
    description: 'Upload and manage medical records',
    icon: Building2,
  },
  {
    value: 'insurance' as RegisterRole,
    label: 'Insurance Provider',
    description: 'Verify claims with patient-approved access',
    icon: ShieldCheck,
  },
] as const;

// ─── Form schemas ─────────────────────────────────────────
const baseSchema = z
  .object({
    firstName: z.string().min(2, 'Min 2 characters').max(80).trim(),
    lastName: z.string().min(2, 'Min 2 characters').max(80).trim(),
    email: z.string().email('Invalid email').toLowerCase().trim(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile (10 digits, starts 6-9)')
      .optional()
      .or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const patientSchema = baseSchema.extend({
  dateOfBirth: z.string({ required_error: 'Date of birth is required' }).refine((v) => {
    const d = new Date(v);
    const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return !isNaN(d.getTime()) && age >= 0 && age <= 150;
  }, 'Invalid date of birth'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], { required_error: 'Gender is required' }),
  bloodGroup: z.enum(['A_POSITIVE','A_NEGATIVE','B_POSITIVE','B_NEGATIVE','AB_POSITIVE','AB_NEGATIVE','O_POSITIVE','O_NEGATIVE','UNKNOWN']).default('UNKNOWN'),
});

const doctorSchema = baseSchema.extend({
  hospitalId: z.string({ required_error: 'Hospital is required' }).min(1, 'Hospital is required'),
  specialty: z.string({ required_error: 'Specialty is required' }).min(2).max(100).trim(),
  licenseNumber: z.string({ required_error: 'License number is required' }).min(3).max(50).trim(),
  qualifications: z.string().min(2, 'Enter at least one qualification'),
  experienceYears: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 80, 'Must be 0–80'),
  consultationFee: z.string().optional().default('0'),
});

const staffSchema = baseSchema.extend({
  hospitalId: z.string({ required_error: 'Hospital is required' }).min(1, 'Hospital is required'),
  staffType: z.enum(['NURSE','PHARMACIST','LAB_TECHNICIAN','RECEPTIONIST','RADIOLOGIST','OTHER'], { required_error: 'Staff type is required' }),
  employeeId: z.string().max(50).optional().or(z.literal('')),
});

const insuranceSchema = baseSchema.extend({
  companyName: z.string({ required_error: 'Company name is required' }).min(2).max(200).trim(),
  licenseNumber: z.string({ required_error: 'IRDAI license is required' }).min(3).max(50).trim(),
});

type PatientFormData = z.infer<typeof patientSchema>;
type DoctorFormData = z.infer<typeof doctorSchema>;
type StaffFormData = z.infer<typeof staffSchema>;
type InsuranceFormData = z.infer<typeof insuranceSchema>;

// ─── Shared UI helpers ────────────────────────────────────
const inputCls =
  'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';

function InputField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function FormHeader({ role, onBack }: { role: RegisterRole; onBack: () => void }) {
  const cfg = ROLES.find((r) => r.value === role)!;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 mb-4">
      <button type="button" onClick={onBack}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground leading-tight">Register as {cfg.label}</h2>
          <p className="text-xs text-muted-foreground">{cfg.description}</p>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PasswordFields({ showPass, setShowPass, showConfirm, setShowConfirm, register, errors }: any) {
  return (
    <>
      <InputField label="Password" error={errors.password?.message} hint="Min 8 chars, uppercase, lowercase, number, special (@$!%*?&)">
        <div className="relative">
          <input {...register('password')} type={showPass ? 'text' : 'password'} autoComplete="new-password"
            placeholder="••••••••" className={inputCls + ' pr-10'} />
          <button type="button" tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPass((p: boolean) => !p)}>
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </InputField>
      <InputField label="Confirm password" error={errors.confirmPassword?.message}>
        <div className="relative">
          <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
            placeholder="••••••••" className={inputCls + ' pr-10'} />
          <button type="button" tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm((p: boolean) => !p)}>
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </InputField>
    </>
  );
}

function SubmitButton({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <button type="submit" disabled={isPending}
      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
      {isPending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />Processing…
        </span>
      ) : label}
    </button>
  );
}

// ─── Step 1: Role picker ──────────────────────────────────
function StepRole({ onSelect }: { onSelect: (r: RegisterRole) => void }) {
  return (
    <div className="space-y-3">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-foreground">Choose your role</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Select how you will use UHID Health</p>
      </div>
      {ROLES.map((r) => {
        const Icon = r.icon;
        return (
          <button key={r.value} type="button" onClick={() => onSelect(r.value)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2 forms ─────────────────────────────────────────
function PatientForm({ onBack, onDone, isPending, serverError }: { onBack: () => void; onDone: (d: PatientFormData) => void; isPending: boolean; serverError?: string }) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: { bloodGroup: 'UNKNOWN' },
  });
  return (
    <form onSubmit={handleSubmit(onDone)} className="space-y-4">
      <FormHeader role="patient" onBack={onBack} />
      {serverError && <ErrorBanner message={serverError} />}
      <div className="grid grid-cols-2 gap-3">
        <InputField label="First name" error={errors.firstName?.message}>
          <input {...register('firstName')} placeholder="Rahul" className={inputCls} />
        </InputField>
        <InputField label="Last name" error={errors.lastName?.message}>
          <input {...register('lastName')} placeholder="Sharma" className={inputCls} />
        </InputField>
      </div>
      <InputField label="Email address" error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" placeholder="you@gmail.com" className={inputCls} />
      </InputField>
      <InputField label="Mobile number" error={errors.phone?.message} hint="10-digit Indian mobile">
        <input {...register('phone')} type="tel" placeholder="9876543210" className={inputCls} />
      </InputField>
      <InputField label="Date of birth" error={errors.dateOfBirth?.message}>
        <input {...register('dateOfBirth')} type="date" className={inputCls} />
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Gender" error={errors.gender?.message}>
          <select {...register('gender')} className={inputCls}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </InputField>
        <InputField label="Blood group" error={errors.bloodGroup?.message}>
          <select {...register('bloodGroup')} className={inputCls}>
            <option value="UNKNOWN">Unknown</option>
            <option value="A_POSITIVE">A+</option>
            <option value="A_NEGATIVE">A−</option>
            <option value="B_POSITIVE">B+</option>
            <option value="B_NEGATIVE">B−</option>
            <option value="AB_POSITIVE">AB+</option>
            <option value="AB_NEGATIVE">AB−</option>
            <option value="O_POSITIVE">O+</option>
            <option value="O_NEGATIVE">O−</option>
          </select>
        </InputField>
      </div>
      <PasswordFields showPass={showPass} setShowPass={setShowPass} showConfirm={showConfirm} setShowConfirm={setShowConfirm} register={register} errors={errors} />
      <SubmitButton isPending={isPending} label="Create Patient Account" />
    </form>
  );
}

function DoctorForm({ onBack, onDone, isPending, serverError }: { onBack: () => void; onDone: (d: DoctorFormData) => void; isPending: boolean; serverError?: string }) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const { data: hospitals = [], isLoading: hospitalsLoading } = useHospitals(hospitalSearch);
  const { register, handleSubmit, formState: { errors } } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { consultationFee: '0' },
  });
  return (
    <form onSubmit={handleSubmit(onDone)} className="space-y-4">
      <FormHeader role="doctor" onBack={onBack} />
      {serverError && <ErrorBanner message={serverError} />}
      <div className="grid grid-cols-2 gap-3">
        <InputField label="First name" error={errors.firstName?.message}>
          <input {...register('firstName')} placeholder="Arjun" className={inputCls} />
        </InputField>
        <InputField label="Last name" error={errors.lastName?.message}>
          <input {...register('lastName')} placeholder="Mehta" className={inputCls} />
        </InputField>
      </div>
      <InputField label="Email address" error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" placeholder="doctor@gmail.com" className={inputCls} />
      </InputField>
      <InputField label="Mobile number" error={errors.phone?.message} hint="10-digit Indian mobile">
        <input {...register('phone')} type="tel" placeholder="9876543210" className={inputCls} />
      </InputField>
      <InputField label="Hospital" error={errors.hospitalId?.message} hint="Search and select your hospital">
        <input type="text" placeholder="Type to search hospital…" className={inputCls + ' mb-1.5'}
          value={hospitalSearch} onChange={(e) => setHospitalSearch(e.target.value)} />
        <select {...register('hospitalId')} className={inputCls}>
          <option value="">{hospitalsLoading ? 'Loading hospitals…' : 'Select hospital'}</option>
          {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
        </select>
      </InputField>
      <InputField label="Specialty" error={errors.specialty?.message}>
        <input {...register('specialty')} placeholder="e.g. Cardiology, General Medicine" className={inputCls} />
      </InputField>
      <InputField label="Medical license number" error={errors.licenseNumber?.message}>
        <input {...register('licenseNumber')} placeholder="e.g. MH-MED-2018-12345" className={inputCls} />
      </InputField>
      <InputField label="Qualifications" error={errors.qualifications?.message} hint="Comma separated — e.g. MBBS, MD Cardiology">
        <input {...register('qualifications')} placeholder="MBBS, MD Cardiology" className={inputCls} />
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Experience (years)" error={errors.experienceYears?.message}>
          <input {...register('experienceYears')} type="number" min={0} max={80} placeholder="5" className={inputCls} />
        </InputField>
        <InputField label="Consultation fee (₹)" error={errors.consultationFee?.message}>
          <input {...register('consultationFee')} type="number" min={0} placeholder="500" className={inputCls} />
        </InputField>
      </div>
      <PasswordFields showPass={showPass} setShowPass={setShowPass} showConfirm={showConfirm} setShowConfirm={setShowConfirm} register={register} errors={errors} />
      <SubmitButton isPending={isPending} label="Submit Doctor Application" />
      <p className="text-xs text-center text-muted-foreground">Doctor accounts are reviewed by hospital admin before activation.</p>
    </form>
  );
}

function StaffForm({ onBack, onDone, isPending, serverError }: { onBack: () => void; onDone: (d: StaffFormData) => void; isPending: boolean; serverError?: string }) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const { data: hospitals = [], isLoading: hospitalsLoading } = useHospitals(hospitalSearch);
  const { register, handleSubmit, formState: { errors } } = useForm<StaffFormData>({ resolver: zodResolver(staffSchema) });
  return (
    <form onSubmit={handleSubmit(onDone)} className="space-y-4">
      <FormHeader role="staff" onBack={onBack} />
      {serverError && <ErrorBanner message={serverError} />}
      <div className="grid grid-cols-2 gap-3">
        <InputField label="First name" error={errors.firstName?.message}>
          <input {...register('firstName')} placeholder="Priya" className={inputCls} />
        </InputField>
        <InputField label="Last name" error={errors.lastName?.message}>
          <input {...register('lastName')} placeholder="Nair" className={inputCls} />
        </InputField>
      </div>
      <InputField label="Email address" error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" placeholder="staff@hospital.com" className={inputCls} />
      </InputField>
      <InputField label="Mobile number" error={errors.phone?.message} hint="10-digit Indian mobile">
        <input {...register('phone')} type="tel" placeholder="9876543210" className={inputCls} />
      </InputField>
      <InputField label="Hospital" error={errors.hospitalId?.message}>
        <input type="text" placeholder="Type to search hospital…" className={inputCls + ' mb-1.5'}
          value={hospitalSearch} onChange={(e) => setHospitalSearch(e.target.value)} />
        <select {...register('hospitalId')} className={inputCls}>
          <option value="">{hospitalsLoading ? 'Loading…' : 'Select hospital'}</option>
          {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
        </select>
      </InputField>
      <InputField label="Staff type" error={errors.staffType?.message}>
        <select {...register('staffType')} className={inputCls}>
          <option value="">Select staff type</option>
          <option value="NURSE">Nurse</option>
          <option value="PHARMACIST">Pharmacist</option>
          <option value="LAB_TECHNICIAN">Lab Technician</option>
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="RADIOLOGIST">Radiologist</option>
          <option value="OTHER">Other</option>
        </select>
      </InputField>
      <InputField label="Employee ID" error={errors.employeeId?.message} hint="Optional — internal hospital ID">
        <input {...register('employeeId')} placeholder="EMP-12345" className={inputCls} />
      </InputField>
      <PasswordFields showPass={showPass} setShowPass={setShowPass} showConfirm={showConfirm} setShowConfirm={setShowConfirm} register={register} errors={errors} />
      <SubmitButton isPending={isPending} label="Submit Staff Application" />
    </form>
  );
}

function InsuranceForm({ onBack, onDone, isPending, serverError }: { onBack: () => void; onDone: (d: InsuranceFormData) => void; isPending: boolean; serverError?: string }) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<InsuranceFormData>({ resolver: zodResolver(insuranceSchema) });
  return (
    <form onSubmit={handleSubmit(onDone)} className="space-y-4">
      <FormHeader role="insurance" onBack={onBack} />
      {serverError && <ErrorBanner message={serverError} />}
      <div className="grid grid-cols-2 gap-3">
        <InputField label="First name" error={errors.firstName?.message}>
          <input {...register('firstName')} placeholder="Suresh" className={inputCls} />
        </InputField>
        <InputField label="Last name" error={errors.lastName?.message}>
          <input {...register('lastName')} placeholder="Agarwal" className={inputCls} />
        </InputField>
      </div>
      <InputField label="Email address" error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" placeholder="contact@insurer.com" className={inputCls} />
      </InputField>
      <InputField label="Company name" error={errors.companyName?.message}>
        <input {...register('companyName')} placeholder="HDFC ERGO General Insurance" className={inputCls} />
      </InputField>
      <InputField label="IRDAI license number" error={errors.licenseNumber?.message}>
        <input {...register('licenseNumber')} placeholder="IRDAI/HLT/12345" className={inputCls} />
      </InputField>
      <InputField label="Mobile number" error={errors.phone?.message} hint="10-digit Indian mobile">
        <input {...register('phone')} type="tel" placeholder="9876543210" className={inputCls} />
      </InputField>
      <PasswordFields showPass={showPass} setShowPass={setShowPass} showConfirm={showConfirm} setShowConfirm={setShowConfirm} register={register} errors={errors} />
      <SubmitButton isPending={isPending} label="Submit Application" />
    </form>
  );
}

// ─── Step 3: Success ──────────────────────────────────────
function SuccessScreen({ role, uhid, email }: { role: RegisterRole; uhid?: string | null; email: string }) {
  const navigate = useNavigate();
  const dest: Record<RegisterRole, string> = {
    patient: '/patient/dashboard', doctor: '/doctor/dashboard',
    staff: '/staff/dashboard', insurance: '/insurance/dashboard',
  };
  return (
    <div className="text-center space-y-5 py-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {role === 'patient' ? 'Account created!' : 'Application submitted!'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          {role === 'patient'
            ? 'Check your email to verify your account and activate it.'
            : 'Your application is under review. You will be notified once approved.'}
        </p>
      </div>
      {role === 'patient' && uhid && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-6 py-4">
          <p className="text-xs text-muted-foreground mb-1">Your Unique Health ID</p>
          <p className="text-2xl font-bold text-primary tracking-widest">{uhid}</p>
          <p className="text-xs text-muted-foreground mt-1">Keep this safe — it is your medical identity</p>
        </div>
      )}
      <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Verification email sent to <span className="font-medium text-foreground">{email}</span>
      </div>
      <button type="button" onClick={() => navigate(dest[role])}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
        Continue to Dashboard
      </button>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = ['Choose Role', 'Fill Details', 'Done'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
            i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
          {i < steps.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedRole, setSelectedRole] = useState<RegisterRole | null>(null);
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState<{ uhid?: string | null; email: string } | null>(null);

  const register = useRegister();

  const handleRoleSelect = (role: RegisterRole) => {
    setSelectedRole(role);
    setStep(1);
  };

  const handleSubmitForm = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (formData: any) => {
      if (!selectedRole) return;
      setServerError('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let payload: any = { ...formData, role: selectedRole };
      if (selectedRole === 'doctor') {
        payload = {
          ...payload,
          qualifications: (formData.qualifications as string).split(',').map((s: string) => s.trim()).filter(Boolean),
          experienceYears: Number(formData.experienceYears),
          consultationFee: Number(formData.consultationFee ?? 0),
        };
      }
      register.mutate(payload, {
        onSuccess: () => {
          const user = useAuthStore.getState().user;
          setSuccessData({ uhid: user?.uhid, email: formData.email });
          setStep(2);
        },
        onError: (err) => setServerError(getErrorMessage(err)),
      });
    },
    [selectedRole, register]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-md">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">UHID Health</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Create your health identity</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          <StepIndicator step={step} />
          {step === 0 && <StepRole onSelect={handleRoleSelect} />}
          {step === 1 && selectedRole === 'patient' && <PatientForm onBack={() => setStep(0)} onDone={handleSubmitForm} isPending={register.isPending} serverError={serverError} />}
          {step === 1 && selectedRole === 'doctor' && <DoctorForm onBack={() => setStep(0)} onDone={handleSubmitForm} isPending={register.isPending} serverError={serverError} />}
          {step === 1 && selectedRole === 'staff' && <StaffForm onBack={() => setStep(0)} onDone={handleSubmitForm} isPending={register.isPending} serverError={serverError} />}
          {step === 1 && selectedRole === 'insurance' && <InsuranceForm onBack={() => setStep(0)} onDone={handleSubmitForm} isPending={register.isPending} serverError={serverError} />}
          {step === 2 && selectedRole && successData && <SuccessScreen role={selectedRole} uhid={successData.uhid} email={successData.email} />}
        </div>

        {step !== 2 && (
          <div className="text-center mt-5 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secured with 256-bit encryption · HIPAA compliant</span>
        </div>
      </div>
    </div>
  );
}
