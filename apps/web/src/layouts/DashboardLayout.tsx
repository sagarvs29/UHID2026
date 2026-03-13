import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/stores/auth.store';
import { useLogout } from '@/hooks/useAuth';
import {
  Home,
  FileText,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  Activity,
  QrCode,
  User,
  Upload,
  Search,
  ScrollText,
  BarChart2,
  Clock,
  UserCog,
  Building2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PATIENT: [
    { to: '/patient/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/records', icon: FileText, label: 'My Records' },
    { to: '/consent', icon: Shield, label: 'Consents' },
    { to: '/qr', icon: QrCode, label: 'My QR Code' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/doctor/patients', icon: Users, label: 'My Patients' },
    { to: '/doctor/consents', icon: Shield, label: 'Consents' },
    { to: '/doctor/records', icon: FileText, label: 'Records' },
    { to: '/doctor/profile', icon: User, label: 'Profile' },
  ],
  HOSPITAL_STAFF: [
    { to: '/staff/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/staff/upload', icon: Upload, label: 'Upload Record' },
    { to: '/staff/search', icon: Search, label: 'Search Patient' },
    { to: '/staff/records', icon: FileText, label: 'All Records' },
    { to: '/staff/profile', icon: User, label: 'Profile' },
  ],
  HOSPITAL_ADMIN: [
    { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/admin/staff', icon: UserCog, label: 'Staff' },
    { to: '/admin/doctors', icon: Users, label: 'Doctors' },
    { to: '/admin/audit', icon: ScrollText, label: 'Audit Logs' },
    { to: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  ],
  INSURANCE_PROVIDER: [
    { to: '/insurance/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/insurance/claims/pending', icon: Clock, label: 'Pending Claims' },
    { to: '/insurance/claims/approved', icon: FileText, label: 'Approved' },
    { to: '/insurance/access', icon: Shield, label: 'Access Requests' },
    { to: '/insurance/profile', icon: Building2, label: 'Company Profile' },
  ],
  SUPER_ADMIN: [
    { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/admin/staff', icon: UserCog, label: 'Staff' },
    { to: '/admin/doctors', icon: Users, label: 'Doctors' },
    { to: '/admin/audit', icon: ScrollText, label: 'Audit Logs' },
    { to: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  ],
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const navItems: NavItem[] = user?.role ? (NAV_BY_ROLE[user.role] ?? []) : [];

  const roleLabelMap: Record<Role, string> = {
    PATIENT: 'Patient',
    DOCTOR: 'Doctor',
    HOSPITAL_STAFF: 'Hospital Staff',
    HOSPITAL_ADMIN: 'Administrator',
    INSURANCE_PROVIDER: 'Insurance Provider',
    SUPER_ADMIN: 'Super Admin',
  };
  const roleLabel = user?.role ? roleLabelMap[user.role] : '';

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login'),
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ─── Mobile overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">UHID</span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {user?.uhid && (
            <p className="text-xs font-mono text-primary mt-1">{user.uhid}</p>
          )}
          {roleLabel && (
            <span className="inline-block mt-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary tracking-wide">
              {roleLabel}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b bg-card">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {roleLabel && (
              <span className="hidden sm:inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {roleLabel}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
