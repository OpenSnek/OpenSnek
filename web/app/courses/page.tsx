"use client";

import { useState } from "react";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Loader2,
  LogOut,
  X,
  Library,
} from "lucide-react";
import { useCourse } from "@/context/CourseContext";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";

export default function CoursesPage() {
  const { courses, refreshCourses, isLoading } = useCourse();
  const { user } = useAuth();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [leavingCourseId, setLeavingCourseId] = useState<string | null>(null);
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);

  const handleLeaveCourse = async (courseId: string) => {
    setConfirmLeaveId(null);
    setLeavingCourseId(courseId);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/opensnek/courses/${courseId}/leave`),
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) await refreshCourses();
    } catch {
      // Silently fail — course list will refresh next visit
    } finally {
      setLeavingCourseId(null);
    }
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
    <div className="h-screen flex flex-col animate-fade-in p-6">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <Library className="w-8 h-8" style={{ color: "#8DBF5A" }} />
              My Courses
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Welcome back, {user?.name || "Student"}
            </p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-all shadow-sm text-sm active:scale-[0.98]"
            style={{ backgroundColor: "#8DBF5A" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#7aaa4a")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#8DBF5A")
            }
          >
            <Plus className="w-4 h-4" />
            Join Course
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: "#8DBF5A", borderTopColor: "transparent" }}
            />
            Loading...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && courses.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              No courses yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-6">
              Join a course using an enrollment code from your professor.
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-colors text-sm"
              style={{ backgroundColor: "#8DBF5A" }}
            >
              <Plus className="w-4 h-4" />
              Join Course
            </button>
          </div>
        )}

        {/* Course list */}
        {!isLoading && courses.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Library className="w-5 h-5" style={{ color: "#8DBF5A" }} />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Enrolled Courses
              </h2>
              <span className="text-xs text-slate-400 ml-auto">
                {courses.length} {courses.length === 1 ? "course" : "courses"}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <BookOpen
                          className="w-5 h-5"
                          style={{ color: "#8DBF5A" }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                            {course.code}
                          </span>
                        </div>

                        {/* Leave control */}
                        <div className="flex items-center gap-1">
                          {confirmLeaveId === course.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-500 font-medium mr-1">
                                Leave?
                              </span>
                              <button
                                onClick={() => setConfirmLeaveId(null)}
                                className="px-2 py-0.5 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleLeaveCourse(course.id)}
                                className="px-2 py-0.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                Leave
                              </button>
                            </div>
                          ) : leavingCourseId === course.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                          ) : (
                            <span
                              role="button"
                              tabIndex={0}
                              title="Leave course"
                              onClick={() => setConfirmLeaveId(course.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  setConfirmLeaveId(course.id);
                              }}
                              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5 text-red-400" />
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate pr-4">
                        {course.name}
                      </h3>

                      {course.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mt-2">
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
                        {course.kb_name && (
                          <span
                            className="flex items-center gap-1 font-medium"
                            style={{ color: "#8DBF5A" }}
                          >
                            <BookOpen className="w-3 h-3" />
                            {course.kb_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: "#8DBF5A20" }}
                >
                  <Plus className="w-5 h-5" style={{ color: "#8DBF5A" }} />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Join a Course
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError("");
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 text-slate-900 dark:text-slate-100 transition-colors"
              autoFocus
            />

            {joinError && (
              <p className="text-sm text-red-500 mt-2">{joinError}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={!enrollCode.trim() || joinLoading}
              className="w-full mt-4 py-3 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ backgroundColor: "#8DBF5A" }}
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
