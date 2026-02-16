"use client";

/**
 * Authentication context for OpenSnek.
 *
 * Wraps NextAuth.js SessionProvider and exposes a useAuth() hook
 * for client components to access the authenticated user.
 */

import React, { createContext, useContext } from "react";
import { SessionProvider, useSession } from "next-auth/react";

interface AuthUser {
  name: string;
  email: string;
  role: string;
  azure_oid: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

function AuthContextInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextType = {
    user: session?.user
      ? {
          name: session.user.name || "",
          email: session.user.email || "",
          role: (session.user as any).role || "student",
          azure_oid: (session.user as any).azure_oid || "",
        }
      : null,
    isAuthenticated: !!session,
    isLoading: status === "loading",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <SessionProvider session={session}>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
