"use client";

import { useAuth } from "@/context/AuthContext";
import { GraduationCap } from "lucide-react";

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (user && user.role !== "professor" && user.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Access restricted to professors.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
