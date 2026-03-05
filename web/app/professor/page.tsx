"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  BookOpen,
  Activity,
  ArrowRight,
  Loader2,
  GraduationCap,
  Plus,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface CourseOverview {
  id: string;
  name: string;
  code: string;
  enrolled_count: number;
  kb_name: string | null;
}

const professorTabs = [
  { href: "/professor", label: "Overview", exact: true },
  { href: "/professor/courses", label: "Courses", exact: false },
];

export default function ProfessorDashboard() {
  const pathname = usePathname();
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/opensnek/courses"), {
          credentials: "include",
        });
        if (res.ok) setCourses(await res.json());
      } catch (e) {
        console.warn("Failed to fetch courses:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.enrolled_count || 0),
    0,
  );

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
              Your teaching activity at a glance
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
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-4 w-fit">
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
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading...
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {courses.length}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Active Courses
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {totalStudents}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Total Students
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {courses.filter((c) => c.kb_name).length}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      With Materials
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Course list */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Your Courses
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                  {courses.length}{" "}
                  {courses.length === 1 ? "course" : "courses"}
                </span>
              </div>

              {courses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    No courses yet
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-6">
                    Create your first course to get started.
                  </p>
                  <Link
                    href="/professor/courses/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Course
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {courses.map((course) => (
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
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {course.enrolled_count || 0} students
                          </span>
                          {course.kb_name && (
                            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                              <BookOpen className="w-3.5 h-3.5" />
                              {course.kb_name}
                            </span>
                          )}
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
          </>
        )}
      </div>
    </div>
  );
}
