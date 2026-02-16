"use client";

/**
 * Professor course detail — students, analytics, materials tabs.
 */

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
            fetch(apiUrl(`/api/v1/opensnek/courses/${courseId}`), { credentials: "include" }),
            fetch(apiUrl(`/api/v1/opensnek/courses/${courseId}/students`), { credentials: "include" }),
            fetch(apiUrl(`/api/v1/opensnek/professor/courses/${courseId}/analytics/features`), { credentials: "include" }),
            fetch(apiUrl(`/api/v1/opensnek/professor/courses/${courseId}/analytics/topics`), { credentials: "include" }),
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
      const res = await fetch(apiUrl(`/api/v1/opensnek/courses/${courseId}/kb`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kb_name: kbName.trim() }),
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-slate-500">Course not found.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "students", label: "Students", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "materials", label: "Materials", icon: BookOpen },
  ];

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

  const maxFeatureCount = Math.max(...features.map((f) => f.count), 1);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <Link
        href="/professor/courses"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </Link>

      {/* Course header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
              {course.code}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {course.name}
          </h1>
          {course.description && (
            <p className="text-slate-500 mt-1">{course.description}</p>
          )}
        </div>

        {/* Enrollment code */}
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Enrollment Code</div>
          <button
            onClick={copyEnrollmentLink}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {course.enrollment_code}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <div className="text-[10px] text-slate-400 mt-1">
            Click to copy join link
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "students" && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded">
                {students.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "students" && (
        <div>
          {students.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                No students enrolled yet. Share the enrollment code above.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">
                      Student
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">
                      Sessions
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">
                      Last Active
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-5 py-3">
                      Enrolled
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {s.total_sessions}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {s.last_active
                          ? new Date(s.last_active).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {new Date(s.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => removeStudent(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Remove student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Feature usage */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Feature Usage (Last 30 Days)
            </h3>
            {features.length === 0 ? (
              <p className="text-slate-400 text-sm">No activity data yet.</p>
            ) : (
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600 dark:text-slate-300 capitalize">
                      {f.feature.replace("_", " ")}
                    </div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${featureColors[f.feature] || "bg-slate-500"} flex items-center justify-end px-2`}
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

          {/* Top topics */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Most Asked Topics
            </h3>
            {topics.length === 0 ? (
              <p className="text-slate-400 text-sm">No topic data yet.</p>
            ) : (
              <div className="space-y-2">
                {topics.slice(0, 15).map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-700 dark:text-slate-200 truncate">
                        {t.topic}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        via {t.feature.replace("_", " ")}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 ml-3">
                      {t.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Knowledge Base
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Link a DeepTutor knowledge base to this course. Students will only
            have access to this KB. You can create and upload materials to KBs
            from the{" "}
            <Link
              href="/knowledge"
              className="text-teal-600 hover:underline"
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
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button
              onClick={handleLinkKb}
              disabled={!kbName.trim() || kbSaving}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
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
            <div className="mt-4 flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
              <BookOpen className="w-4 h-4" />
              Current KB: <strong>{course.kb_name}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
