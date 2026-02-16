"use client";

/**
 * AppShell — conditionally renders the sidebar layout.
 *
 * When the user is authenticated, shows the full app with sidebar.
 * When not authenticated (login page), shows bare content.
 */

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  // Show bare layout for login page or unauthenticated users
  if (isLoginPage || (!isAuthenticated && !isLoading)) {
    return <main className="h-screen">{children}</main>;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Full app shell with sidebar
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        {children}
      </main>
    </div>
  );
}
