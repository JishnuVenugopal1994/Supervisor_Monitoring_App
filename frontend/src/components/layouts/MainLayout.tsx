import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const { user, logout } = useAuth();
  useSocket();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-800 text-lg">Shop Floor</span>
          <nav className="flex gap-4">
            {[
              { to: '/board', label: 'Board' },
              { to: '/work-orders', label: 'Work Orders' },
              { to: '/resources', label: 'Resources' },
              { to: '/materials', label: 'Materials' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-blue-600 font-medium text-sm'
                    : 'text-gray-500 hover:text-gray-800 text-sm'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            {user?.username}{' '}
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {user?.role}
            </span>
          </span>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
