"use client";

/**
 * Course selection page — students see enrolled courses and can join new ones.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { useCourse, Course } from "@/context/CourseContext";
import { useAuth } from "@/context/AuthContext";
import { useGlobal } from "@/context/GlobalContext";
import { apiUrl } from "@/lib/api";

export default function CoursesPage() {
  const { courses, activeCourse, setActiveCourse, refreshCourses, isLoading } =
    useCourse();
  const { user } = useAuth();
  const { setChatState } = useGlobal();
  const router = useRouter();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleSelectCourse = (course: Course) => {
    setActiveCourse(course);
    // Sync KB to GlobalContext
    if (course.kb_name) {
      setChatState((prev) => ({ ...prev, selectedKb: course.kb_name! }));
    }
    router.push("/");
  };

  const handleJoin = async () => {
    if (!enrollCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");

    try {
      const res = await fetch(apiUrl("/api/v1/opensnek/enroll"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enrollment_code: enrollCode.trim() }),
      });

      if (res.ok) {
        setShowJoinModal(false);
        setEnrollCode("");
        await refreshCourses();
      } else {
        const data = await res.json();
        setJoinError(data.detail || "Failed to join course");
      }
    } catch {
      setJoinError("Network error. Please try again.");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                My Courses
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Welcome back, {user?.name || "Student"}
              </p>
            </div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              Join Course
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && courses.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No courses yet
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Join a course using an enrollment code from your professor.
              </p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Join Course
              </button>
            </div>
          )}

          {/* Course grid */}
          {!isLoading && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className={`group text-left p-6 rounded-2xl border transition-all hover:shadow-lg ${
                    activeCourse?.id === course.id
                      ? "border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-200 dark:hover:border-teal-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {course.code}
                      </span>
                      {activeCourse?.id === course.id && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {course.name}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    {course.professor_name && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.professor_name}
                      </span>
                    )}
                    {course.enrolled_count != null && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.enrolled_count} students
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {course.kb_name && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 text-teal-500" />
                      <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                        {course.kb_name}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Join a Course
              </h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError("");
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Enter the enrollment code provided by your professor.
            </p>

            <input
              type="text"
              placeholder="Enrollment code"
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 dark:text-slate-100"
              autoFocus
            />

            {joinError && (
              <p className="text-sm text-red-500 mt-2">{joinError}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!enrollCode.trim() || joinLoading}
              className="w-full mt-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {joinLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Join Course
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
