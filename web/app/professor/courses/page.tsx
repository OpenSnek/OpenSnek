"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  BookOpen,
  Users,
  ArrowRight,
  Loader2,
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  kb_name: string | null;
  enrollment_code: string;
  enrolled_count: number;
  is_active: boolean;
  created_at: string;
}

const professorTabs = [
  { href: "/professor", label: "Overview", exact: true },
  { href: "/professor/courses", label: "Courses", exact: false },
];

export default function ProfessorCoursesPage() {
  const pathname = usePathname();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/opensnek/courses"), {
          credentials: "include",
        });
        if (res.ok) setCourses(await res.json());
      } catch (e) {
        console.warn("Failed to fetch:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filtered = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen flex flex-col animate-fade-in p-6">
      {/* Header — fixed */}
      <div className="shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              Professor Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Manage your courses and student enrollments
            </p>
          </div>
          <Link
            href="/professor/courses/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            New Course
          </Link>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            {professorTabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-slate-100 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading...
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No courses yet
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-6">
                Create your first course to start managing students and
                materials.
              </p>
              <Link
                href="/professor/courses/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Course
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No courses match your search
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((course) => (
                <Link
                  key={course.id}
                  href={`/professor/courses/${course.id}`}
                  className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {course.code}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {course.name}
                      </h3>
                    </div>
                    {course.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-0.5">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.enrolled_count || 0} students
                      </span>
                      {course.kb_name && (
                        <span className="flex items-center gap-1 text-teal-500 dark:text-teal-400">
                          <BookOpen className="w-3 h-3" />
                          {course.kb_name}
                        </span>
                      )}
                      <span className="font-mono text-slate-300 dark:text-slate-600">
                        {course.enrollment_code}
                      </span>
                    </div>
                  </div>
                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
