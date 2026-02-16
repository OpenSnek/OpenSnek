"use client";

/**
 * Professor courses list page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, ArrowRight, Loader2 } from "lucide-react";
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

export default function ProfessorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Courses
        </h1>
        <Link
          href="/professor/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No courses yet
          </h2>
          <p className="text-slate-500 mb-6">
            Create your first course to start managing students and materials.
          </p>
          <Link
            href="/professor/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/professor/courses/${course.id}`}
              className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                  {course.code}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {course.name}
              </h3>
              {course.description && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                  {course.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {course.enrolled_count || 0} students
                </span>
                {course.kb_name && (
                  <span className="flex items-center gap-1 text-teal-500">
                    <BookOpen className="w-3 h-3" />
                    {course.kb_name}
                  </span>
                )}
                <span className="font-mono text-slate-300">
                  Code: {course.enrollment_code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
