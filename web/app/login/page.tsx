"use client";

/**
 * OpenSnek login page.
 *
 * Design inspired by TimeEdit authentication (see web/public/login/ screenshots):
 * - Teal/emerald gradient background with decorative curved line
 * - Centered white card with logo, university name, and SSO button
 */

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const UNIVERSITY_NAME =
  process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "University";

function LoginCard() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/courses";

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md mx-4">
      {/* Logo in top-right */}
      <div className="absolute top-6 right-6">
        <img
          src="/logo.png"
          alt="OpenSnek"
          width={36}
          height={36}
          className="rounded-lg"
        />
      </div>

      {/* University name */}
      <h1 className="text-2xl font-semibold text-slate-800 mt-2 mb-10">
        {UNIVERSITY_NAME}
      </h1>

      {/* SSO Button */}
      <button
        onClick={() =>
          signIn("microsoft-entra-id", { callbackUrl })
        }
        className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
      >
        Sign in with{" "}
        <strong className="font-bold">Microsoft Single Sign-On (SSO)</strong>
      </button>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-8 text-center">
        OpenSnek @ {UNIVERSITY_NAME}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-emerald-300 to-teal-500 relative overflow-hidden">
      {/* Decorative curved line (inspired by TimeEdit) */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M1100 -100 Q 1300 200 1000 500 Q 700 800 800 1000"
            stroke="rgba(0,0,0,0.07)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M1200 -50 Q 1400 250 1100 550 Q 800 850 900 1050"
            stroke="rgba(0,0,0,0.04)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* Teal gradient blob in top-left */}
      <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-teal-300/50 rounded-full blur-3xl -translate-x-1/4 -translate-y-1/4 pointer-events-none" />

      {/* Login Card */}
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md mx-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-3/4 mb-10" />
            <div className="h-12 bg-slate-200 rounded" />
          </div>
        }
      >
        <LoginCard />
      </Suspense>
    </div>
  );
}
