"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AnimatedShaderBackground from "@/components/ui/animated-shader-background";

const UNIVERSITY_NAME =
  process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "TU/e";

function LoginCard() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/courses";

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl px-10 py-12 w-full max-w-sm mx-4 flex flex-col items-center">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="OpenSnek"
        width={120}
        height={120}
        className="mb-6 drop-shadow-md"
      />

      {/* App name */}
      <h1 className="text-3xl font-bold mb-1" style={{ color: "#8DBF5A" }}>
        OpenSnek
      </h1>

      {/* University name */}
      <p className="text-slate-500 text-sm mb-10 font-medium tracking-wide">
        {UNIVERSITY_NAME}
      </p>

      {/* SURF SSO Button */}
      <button
        onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
        className="w-full text-white font-semibold py-3.5 px-6 rounded-lg transition-colors text-sm tracking-wide shadow-md active:scale-[0.98]"
        style={{
          backgroundColor: "#1a6b3a",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "#155730")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "#1a6b3a")
        }
      >
        Sign in with <strong>SURFconext Single Sign-On (SSO)</strong>
      </button>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-8 text-center">
        OpenSnek &mdash; {UNIVERSITY_NAME}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Animated WebGL shader background */}
      <AnimatedShaderBackground />

      {/* Login Card */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <Suspense
          fallback={
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl px-10 py-12 w-full max-w-sm mx-4 animate-pulse flex flex-col items-center gap-4">
              <div className="w-28 h-28 bg-slate-200 rounded-full" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-12 bg-slate-200 rounded w-full mt-4" />
            </div>
          }
        >
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
