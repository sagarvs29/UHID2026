import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import {
  Shield,
  Heart,
  FileText,
  QrCode,
  Brain,
  Stethoscope,
  ArrowRight,
  Activity,
  Lock,
  Users,
  Hospital,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const ROLE_HOME: Record<string, string> = {
    PATIENT: '/patient/dashboard',
    DOCTOR: '/doctor/dashboard',
    HOSPITAL_STAFF: '/staff/dashboard',
    HOSPITAL_ADMIN: '/admin/dashboard',
    INSURANCE_PROVIDER: '/insurance/dashboard',
    SUPER_ADMIN: '/superadmin/dashboard',
  };

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(ROLE_HOME[user.role] ?? '/login');
    } else {
      navigate('/register');
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Consent-Gated Access',
      desc: 'Your records stay private. Doctors can only access them with your OTP-verified consent.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: FileText,
      title: 'Unified Medical Records',
      desc: 'All your lab reports, prescriptions, and imaging in one secure, lifelong digital vault.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Brain,
      title: 'AI Report Decoder',
      desc: 'Don\'t understand your lab report? Our AI explains complex medical reports in simple language.',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      icon: QrCode,
      title: 'Emergency QR Card',
      desc: 'Generate a QR code that paramedics can scan — shows blood group, allergies, and emergency contacts without login.',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      icon: Stethoscope,
      title: 'Telehealth & Appointments',
      desc: 'Find doctors, book appointments, and join video consultations — all from your browser.',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      icon: Lock,
      title: 'Insurance Claims',
      desc: 'Insurance providers can verify medical records with tamper-proof hash checks and fraud detection.',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ];

  const roles = [
    { icon: Users, label: 'Patient', desc: 'Own your health records' },
    { icon: Stethoscope, label: 'Doctor', desc: 'Access patient data with consent' },
    { icon: Hospital, label: 'Hospital', desc: 'Manage staff & records' },
    { icon: Shield, label: 'Insurance', desc: 'Process & verify claims' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl shadow-lg shadow-primary/20">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">UHID</span>
            <span className="hidden sm:inline text-xs text-muted-foreground font-medium ml-1 mt-0.5">UniHealth ID</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(ROLE_HOME[user?.role ?? ''] ?? '/login')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background decorations */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-xs font-semibold text-primary mb-6">
            <Heart className="w-3.5 h-3.5" />
            India's Unified Health Identity Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            One Health ID.{' '}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Every Record.
            </span>
            <br />
            Lifetime Access.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            UHID assigns you a unique digital health identity that connects all your medical records,
            prescriptions, and lab reports across every hospital in India — secured with consent-based access.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={handleGetStarted}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Create Your UHID'} <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 rounded-xl border text-base font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Sign In
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-12 text-xs text-muted-foreground">
            {['Argon2id Encryption', 'HIPAA-Aligned Audit Logs', 'OTP-Verified Consent'].map((badge) => (
              <div key={badge} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles strip */}
      <section className="py-12 px-6 border-y bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Built for every stakeholder in healthcare
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {roles.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground">Everything you need for modern healthcare</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              From secure record storage to AI-powered insights — UHID covers the full spectrum.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-card p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '6', label: 'User Roles' },
            { value: '10', label: 'Modules' },
            { value: '50+', label: 'API Endpoints' },
            { value: '100%', label: 'Consent-Gated' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl sm:text-4xl font-bold">{value}</p>
              <p className="text-sm opacity-80 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground">Ready to take control of your health records?</h2>
          <p className="text-muted-foreground mt-3">
            Create your UniHealth ID in under 2 minutes. It's free, secure, and works across every hospital.
          </p>
          <button
            onClick={handleGetStarted}
            className="mt-8 inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/25"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Your UHID Now'} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">UHID</span>
            <span className="text-xs text-muted-foreground">— UniHealth ID Platform</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 UniHealth ID. Final Year Project — MCA.
          </p>
        </div>
      </footer>
    </div>
  );
}
