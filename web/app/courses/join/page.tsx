"use client";

/**
 * Join course page — handles direct enrollment links.
 * URL: /courses/join?code=ABCD1234
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-lg text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <p className="text-slate-800 dark:text-slate-100 font-semibold mb-2">
              {message}
            </p>
            <p className="text-sm text-slate-500">Redirecting to courses...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-slate-800 dark:text-slate-100 font-semibold mb-4">
              {message}
            </p>
            <button
              onClick={() => router.push("/courses")}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
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
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
