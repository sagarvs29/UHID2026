import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/stores/auth.store';

// Layouts
import PublicLayout from '@/layouts/PublicLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages - Auth
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Pages - Role dashboards
import PatientDashboardPage from '@/pages/patient/DashboardPage';
import DoctorDashboardPage from '@/pages/doctor/DashboardPage';
import StaffDashboardPage from '@/pages/staff/DashboardPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import SuperAdminDashboardPage from '@/pages/superadmin/DashboardPage';
import InsuranceDashboardPage from '@/pages/insurance/DashboardPage';
import ComingSoonPage from '@/pages/ComingSoonPage';

// Pages - Phase 2: Medical Records
import PatientRecordsPage from '@/pages/patient/RecordsPage';
import DoctorRecordsPage from '@/pages/doctor/RecordsPage';
import StaffUploadRecordPage from '@/pages/staff/UploadRecordPage';
import StaffSearchPatientPage from '@/pages/staff/SearchPatientPage';

const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
    </div>
  </div>
);

// Single source of truth for role → home route
const ROLE_HOME: Record<Role, string> = {
  PATIENT:            '/patient/dashboard',
  DOCTOR:             '/doctor/dashboard',
  HOSPITAL_STAFF:     '/staff/dashboard',
  HOSPITAL_ADMIN:     '/admin/dashboard',
  INSURANCE_PROVIDER: '/insurance/dashboard',
  SUPER_ADMIN:        '/superadmin/dashboard',
};

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public / Guest routes ─── */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* ─── Patient routes ─── */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute roles={['PATIENT']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<PatientDashboardPage />} />
          <Route path="records"   element={<PatientRecordsPage />} />
          <Route path="consent"   element={<ComingSoonPage />} />
          <Route path="qr"        element={<ComingSoonPage />} />
          <Route path="profile"   element={<ComingSoonPage />} />
        </Route>

        {/* ─── Doctor routes ─── */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute roles={['DOCTOR']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DoctorDashboardPage />} />
          <Route path="patients"  element={<ComingSoonPage />} />
          <Route path="consents"  element={<ComingSoonPage />} />
          <Route path="records"   element={<DoctorRecordsPage />} />
          <Route path="profile"   element={<ComingSoonPage />} />
        </Route>

        {/* ─── Staff routes ─── */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute roles={['HOSPITAL_STAFF']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="upload"    element={<StaffUploadRecordPage />} />
          <Route path="search"    element={<StaffSearchPatientPage />} />
          <Route path="records"   element={<ComingSoonPage />} />
          <Route path="profile"   element={<ComingSoonPage />} />
        </Route>

        {/* ─── Hospital Admin routes ─── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['HOSPITAL_ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="staff"     element={<ComingSoonPage />} />
          <Route path="doctors"   element={<ComingSoonPage />} />
          <Route path="audit"     element={<ComingSoonPage />} />
          <Route path="analytics" element={<ComingSoonPage />} />
          <Route path="hospital"  element={<ComingSoonPage />} />
          <Route path="settings"  element={<ComingSoonPage />} />
        </Route>

        {/* ─── Super Admin routes ─── */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"  element={<SuperAdminDashboardPage />} />
          <Route path="hospitals"  element={<ComingSoonPage />} />
          <Route path="users"      element={<ComingSoonPage />} />
          <Route path="insurance"  element={<ComingSoonPage />} />
          <Route path="audit"      element={<ComingSoonPage />} />
          <Route path="analytics"  element={<ComingSoonPage />} />
          <Route path="settings"   element={<ComingSoonPage />} />
        </Route>

        {/* ─── Insurance routes ─── */}
        <Route
          path="/insurance"
          element={
            <ProtectedRoute roles={['INSURANCE_PROVIDER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"       element={<InsuranceDashboardPage />} />
          <Route path="claims/pending"  element={<ComingSoonPage />} />
          <Route path="claims/approved" element={<ComingSoonPage />} />
          <Route path="access"          element={<ComingSoonPage />} />
          <Route path="profile"         element={<ComingSoonPage />} />
        </Route>

        {/* ─── Default redirect ─── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

