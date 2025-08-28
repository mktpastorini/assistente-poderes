"use client";

import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Settings, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminLayout: React.FC = () => {
  const navItems = [
    { name: 'Configurações', path: '/admin/settings', icon: Settings },
    { name: 'Poderes', path: '/admin/powers', icon: Zap },
    { name: 'Conversas', path: '/admin/conversations', icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-64 bg-sidebar dark:bg-sidebar-background text-sidebar-foreground dark:text-sidebar-foreground border-r border-sidebar-border dark:border-sidebar-border p-4">
        <h2 className="text-2xl font-bold mb-6 text-sidebar-primary dark:text-sidebar-primary-foreground">Admin Panel</h2>
        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center p-2 rounded-md text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors",
                    // Add active state styling if needed
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;