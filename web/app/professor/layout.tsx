"use client";

/**
 * Professor dashboard layout with sub-navigation.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, BookOpen, ArrowLeft } from "lucide-react";

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Non-professors see a redirect message (middleware should catch this, but just in case)
  if (user && user.role !== "professor" && user.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-500">Access restricted to professors.</p>
      </div>
    );
  }

  const navItems = [
    { href: "/professor", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/professor/courses", label: "Courses", icon: BookOpen, exact: false },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Professor Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
