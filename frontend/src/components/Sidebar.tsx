import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const clientLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/record-activity', label: 'Record Activity', icon: '+' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '★' },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/admin/users', label: 'Users', icon: 'U' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '★' },
  { to: '/admin/activities', label: 'Activity History', icon: '◷' },
];

export const Sidebar: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  if (!isAuthenticated) return null;
  const links = user?.role === 'admin' ? adminLinks : clientLinks;

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 w-60 bg-white border-r border-gray-100 shadow-sm px-4 py-6">
      <p className="px-3 text-xs font-bold tracking-wider text-gray-400 uppercase mb-3">{user?.role === 'admin' ? 'Admin' : 'Fitness'}</p>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
              isActive ? 'bg-orange-500 text-white shadow-md' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
