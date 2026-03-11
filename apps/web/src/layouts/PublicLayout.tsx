import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-uhid-50 to-blue-100">
      <Outlet />
    </div>
  );
}
