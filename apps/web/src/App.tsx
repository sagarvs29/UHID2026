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

// Pages - Phase 2: Medical Records
import PatientRecordsPage from '@/pages/patient/RecordsPage';
import DoctorRecordsPage from '@/pages/doctor/RecordsPage';
import StaffUploadRecordPage from '@/pages/staff/UploadRecordPage';
import StaffSearchPatientPage from '@/pages/staff/SearchPatientPage';

// Pages - Phase 3: Consent
import PatientConsentPage from '@/pages/patient/ConsentPage';
import DoctorConsentPage from '@/pages/doctor/ConsentPage';

// Pages - Phase 4: Clinical portal
import PatientLookupPage from '@/pages/doctor/PatientLookupPage';
import DoctorPatientDashboardPage from '@/pages/doctor/PatientDashboardPage';
import NewPrescriptionPage from '@/pages/doctor/NewPrescriptionPage';
import ClinicalNotesPage from '@/pages/doctor/ClinicalNotesPage';

// Pages - Phase 5: AI features
import AiReportPage from '@/pages/patient/AiReportPage';
import AiSummaryPage from '@/pages/doctor/AiSummaryPage';

// Pages - Phase 6: QR & Emergency
import QrPage from '@/pages/patient/QrPage';
import EmergencyPage from '@/pages/emergency/EmergencyPage';

// Pages - Phase 7: Insurance
import NewClaimPage from '@/pages/insurance/NewClaimPage';
import ClaimDetailPage from '@/pages/insurance/ClaimDetailPage';

// Pages - Phase 8: Admin Portal
import AdminStaffPage from '@/pages/admin/StaffPage';
import AdminAuditLogsPage from '@/pages/admin/AuditLogsPage';

// Pages - Phase 9: Telehealth, Appointments & Notifications
import FindDoctorPage from '@/pages/patient/FindDoctorPage';
import PatientAppointmentsPage from '@/pages/patient/AppointmentsPage';
import DoctorAppointmentsPage from '@/pages/doctor/AppointmentsPage';
import VideoCallPage from '@/pages/appointment/VideoCallPage';

// Pages - Replacing ComingSoon placeholders
import ProfilePage from '@/pages/shared/ProfilePage';
import SuperAdminHospitalsPage from '@/pages/superadmin/HospitalsPage';
import SuperAdminUsersPage from '@/pages/superadmin/UsersPage';
import SuperAdminInsurancePage from '@/pages/superadmin/InsuranceProvidersPage';
import SuperAdminAnalyticsPage from '@/pages/superadmin/AnalyticsPage';
import SuperAdminSettingsPage from '@/pages/superadmin/SettingsPage';
import AdminDoctorsPage from '@/pages/admin/DoctorsPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';
import AdminHospitalProfilePage from '@/pages/admin/HospitalProfilePage';
import AdminSecuritySettingsPage from '@/pages/admin/SecuritySettingsPage';
import InsurancePendingClaimsPage from '@/pages/insurance/PendingClaimsPage';
import InsuranceApprovedClaimsPage from '@/pages/insurance/ApprovedClaimsPage';
import InsuranceAccessRequestsPage from '@/pages/insurance/AccessRequestsPage';

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
        {/* ─── Public emergency route — NO auth required ─── */}
        <Route path="/emergency/:uhid" element={<EmergencyPage />} />

        {/* ─── Video call route — authenticated any role ─── */}
        <Route
          path="/appointment/:id/call"
          element={
            <ProtectedRoute>
              <VideoCallPage />
            </ProtectedRoute>
          }
        />

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
          <Route path="records"      element={<PatientRecordsPage />} />
          <Route path="records/:id/ai" element={<AiReportPage />} />
          <Route path="consent"      element={<PatientConsentPage />} />
          <Route path="find-doctor"  element={<FindDoctorPage />} />
          <Route path="appointments" element={<PatientAppointmentsPage />} />
          <Route path="qr"           element={<QrPage />} />
          <Route path="profile"      element={<ProfilePage />} />
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
          <Route path="patient-lookup"              element={<PatientLookupPage />} />
          <Route path="patient/:uhid"               element={<DoctorPatientDashboardPage />} />
          <Route path="patient/:uhid/prescribe"     element={<NewPrescriptionPage />} />
          <Route path="patient/:uhid/notes"         element={<ClinicalNotesPage />} />
          <Route path="patient/:uhid/ai-summary"   element={<AiSummaryPage />} />
          <Route path="patients"     element={<Navigate to="/doctor/patient-lookup" replace />} />
          <Route path="consents"     element={<DoctorConsentPage />} />
          <Route path="records"      element={<DoctorRecordsPage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="profile"      element={<ProfilePage />} />
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
          <Route path="records"   element={<Navigate to="/staff/search" replace />} />
          <Route path="profile"   element={<ProfilePage />} />
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
          <Route path="staff"     element={<AdminStaffPage />} />
          <Route path="doctors"   element={<AdminDoctorsPage />} />
          <Route path="audit"     element={<AdminAuditLogsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="hospital"  element={<AdminHospitalProfilePage />} />
          <Route path="settings"  element={<AdminSecuritySettingsPage />} />
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
          <Route path="hospitals"  element={<SuperAdminHospitalsPage />} />
          <Route path="users"      element={<SuperAdminUsersPage />} />
          <Route path="insurance"  element={<SuperAdminInsurancePage />} />
          <Route path="audit"      element={<AdminAuditLogsPage />} />
          <Route path="analytics"  element={<SuperAdminAnalyticsPage />} />
          <Route path="settings"   element={<SuperAdminSettingsPage />} />
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
          <Route path="claims/new"      element={<NewClaimPage />} />
          <Route path="claims/:id"      element={<ClaimDetailPage />} />
          <Route path="claims/pending"  element={<InsurancePendingClaimsPage />} />
          <Route path="claims/approved" element={<InsuranceApprovedClaimsPage />} />
          <Route path="access"          element={<InsuranceAccessRequestsPage />} />
          <Route path="profile"         element={<ProfilePage />} />
        </Route>

        {/* ─── Default redirect ─── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

