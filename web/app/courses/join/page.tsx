"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Library } from "lucide-react";
import { apiUrl } from "@/lib/api";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    code ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    code ? "Joining course..." : "No enrollment code provided",
  );

  useEffect(() => {
    if (!code) return;

    const join = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/opensnek/enroll"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enrollment_code: code }),
        });

        if (res.ok) {
          setStatus("success");
          setMessage("Successfully joined the course!");
          setTimeout(() => router.push("/courses"), 2000);
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.detail || "Failed to join course");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    };

    join();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 w-full max-w-sm text-center">
        {/* Logo mark */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "#8DBF5A20" }}
        >
          <Library className="w-6 h-6" style={{ color: "#8DBF5A" }} />
        </div>

        {status === "loading" && (
          <>
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: "#8DBF5A", borderTopColor: "transparent" }}
            />
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {message}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle
              className="w-10 h-10 mx-auto mb-4"
              style={{ color: "#8DBF5A" }}
            />
            <p className="text-slate-900 dark:text-slate-100 font-semibold mb-2">
              {message}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Redirecting to your courses...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-slate-100 font-semibold mb-4">
              {message}
            </p>
            <button
              onClick={() => router.push("/courses")}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-sm font-medium"
            >
              Go to Courses
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#8DBF5A", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
