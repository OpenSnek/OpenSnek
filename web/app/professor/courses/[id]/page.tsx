"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BarChart3,
  BookOpen,
  Copy,
  Check,
  Loader2,
  Trash2,
  Link as LinkIcon,
  GraduationCap,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface CourseDetail {
  id: string;
  name: string;
  code: string;
  description: string;
  kb_name: string | null;
  enrollment_code: string;
  enrolled_count: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  total_sessions: number;
  last_active: string | null;
}

interface FeatureBreakdown {
  feature: string;
  count: number;
}

interface TopicItem {
  topic: string;
  count: number;
  feature: string;
}

type Tab = "students" | "analytics" | "materials";

const featureColors: Record<string, string> = {
  chat: "bg-blue-500",
  solver: "bg-purple-500",
  question: "bg-pink-500",
  research: "bg-emerald-500",
  guide: "bg-indigo-500",
  ideagen: "bg-amber-500",
  co_writer: "bg-rose-500",
  knowledge: "bg-teal-500",
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [features, setFeatures] = useState<FeatureBreakdown[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [kbName, setKbName] = useState("");
  const [kbSaving, setKbSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, studentsRes, featuresRes, topicsRes] =
          await Promise.all([
            fetch(apiUrl(`/api/v1/opensnek/courses/${courseId}`), {
              credentials: "include",
            }),
            fetch(apiUrl(`/api/v1/opensnek/courses/${courseId}/students`), {
              credentials: "include",
            }),
            fetch(
              apiUrl(
                `/api/v1/opensnek/professor/courses/${courseId}/analytics/features`,
              ),
              { credentials: "include" },
            ),
            fetch(
              apiUrl(
                `/api/v1/opensnek/professor/courses/${courseId}/analytics/topics`,
              ),
              { credentials: "include" },
            ),
          ]);

        if (courseRes.ok) {
          const c = await courseRes.json();
          setCourse(c);
          setKbName(c.kb_name || "");
        }
        if (studentsRes.ok) setStudents(await studentsRes.json());
        if (featuresRes.ok) setFeatures(await featuresRes.json());
        if (topicsRes.ok) setTopics(await topicsRes.json());
      } catch (e) {
        console.warn("Failed to fetch course data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const copyEnrollmentLink = () => {
    if (!course) return;
    const link = `${window.location.origin}/courses/join?code=${course.enrollment_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkKb = async () => {
    if (!kbName.trim()) return;
    setKbSaving(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/opensnek/courses/${courseId}/kb`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ kb_name: kbName.trim() }),
        },
      );
      if (res.ok && course) {
        setCourse({ ...course, kb_name: kbName.trim() });
      }
    } catch (e) {
      console.warn("Failed to link KB:", e);
    } finally {
      setKbSaving(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    try {
      const res = await fetch(
        apiUrl(`/api/v1/opensnek/courses/${courseId}/students/${studentId}`),
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        setStudents(students.filter((s) => s.id !== studentId));
      }
    } catch (e) {
      console.warn("Failed to remove student:", e);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "students", label: "Students", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "materials", label: "Materials", icon: BookOpen },
  ];

  const maxFeatureCount = Math.max(...features.map((f) => f.count), 1);

  return (
    <div className="h-screen flex flex-col animate-fade-in p-6">
      {/* Header — fixed */}
      <div className="shrink-0 pb-4">
        <Link
          href="/professor/courses"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 dark:text-slate-400">
              Loading course...
            </span>
          </div>
        ) : !course ? (
          <p className="text-slate-500 dark:text-slate-400">
            Course not found.
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-8 h-8 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course.enrolled_count} students
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {course.name}
                  </h1>
                  {course.description && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Enrollment code */}
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                  Enrollment Code
                </div>
                <button
                  onClick={copyEnrollmentLink}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {course.enrollment_code}
                  </span>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Click to copy join link
                </div>
              </div>
            </div>

            {/* Pill tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-4 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === "students" && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded">
                      {students.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Scrollable tab content */}
      {!loading && course && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* Students tab */}
          {activeTab === "students" && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {students.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    No students enrolled yet
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Share the enrollment code above to invite students.
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Enrolled Students
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                      {students.length}{" "}
                      {students.length === 1 ? "student" : "students"}
                    </span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-5 py-3">
                          Student
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-5 py-3">
                          Sessions
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-5 py-3">
                          Last Active
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-5 py-3">
                          Enrolled
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                              {s.name}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              {s.email}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {s.total_sessions}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {s.last_active
                              ? new Date(s.last_active).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {new Date(s.enrolled_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => removeStudent(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Analytics tab */}
          {activeTab === "analytics" && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Feature Usage
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                    Last 30 days
                  </span>
                </div>
                <div className="p-5">
                  {features.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">
                      No activity data yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {features.map((f) => (
                        <div key={f.feature} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-slate-600 dark:text-slate-300 capitalize shrink-0">
                            {f.feature.replace("_", " ")}
                          </div>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${featureColors[f.feature] || "bg-slate-500"} flex items-center justify-end px-2 transition-all duration-500`}
                              style={{
                                width: `${Math.max((f.count / maxFeatureCount) * 100, 10)}%`,
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {f.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Most Asked Topics
                  </span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {topics.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
                      No topic data yet.
                    </p>
                  ) : (
                    topics.slice(0, 15).map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {t.topic}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                            via {t.feature.replace("_", " ")}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-4 shrink-0">
                          {t.count}×
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Materials tab */}
          {activeTab === "materials" && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Knowledge Base
                </span>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Link a DeepTutor knowledge base to this course. Students will
                  only have access to this KB. You can create and upload
                  materials to KBs from the{" "}
                  <Link
                    href="/knowledge"
                    className="text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Knowledge Bases
                  </Link>{" "}
                  page.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={kbName}
                    onChange={(e) => setKbName(e.target.value)}
                    placeholder="Knowledge base name (e.g., cs101-materials)"
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                  />
                  <button
                    onClick={handleLinkKb}
                    disabled={!kbName.trim() || kbSaving}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm shrink-0"
                  >
                    {kbSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4" />
                    )}
                    Link KB
                  </button>
                </div>
                {course.kb_name && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl text-sm text-teal-700 dark:text-teal-300">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Current KB: <strong>{course.kb_name}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
