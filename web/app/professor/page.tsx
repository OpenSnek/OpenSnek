"use client";

/**
 * Professor dashboard overview — summary stats across all courses.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, BookOpen, Activity, ArrowRight, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface CourseOverview {
  id: string;
  name: string;
  code: string;
  enrolled_count: number;
  kb_name: string | null;
}

export default function ProfessorDashboard() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Overview
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {courses.length}
              </div>
              <div className="text-sm text-slate-500">Active Courses</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalStudents}
              </div>
              <div className="text-sm text-slate-500">Total Students</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {courses.filter((c) => c.kb_name).length}
              </div>
              <div className="text-sm text-slate-500">With Materials</div>
            </div>
          </div>
        </div>
      </div>

      {/* Course list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Your Courses
        </h2>
        <Link
          href="/professor/courses/new"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          + New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">
            No courses yet. Create your first course to get started.
          </p>
          <Link
            href="/professor/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Create Course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/professor/courses/${course.id}`}
              className="group flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                    {course.code}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {course.name}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{course.enrolled_count || 0} students</span>
                  {course.kb_name && (
                    <span className="text-teal-600 dark:text-teal-400">
                      KB: {course.kb_name}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
