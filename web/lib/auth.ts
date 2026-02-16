/**
 * NextAuth.js v5 configuration for OpenSnek.
 *
 * Uses Azure AD (Microsoft Entra ID) as the sole identity provider.
 * JWT session strategy — tokens are verified on the FastAPI backend
 * via the shared NEXTAUTH_SECRET.
 */

import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      azure_oid?: string;
      role?: string;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    azure_oid?: string;
    role?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // Tenant ID is set via the issuer URL (tenantId is not a direct option)
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "common"}/v2.0`,
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, sync with OpenSnek backend
      if (account && profile) {
        // Azure AD profile fields vary by token version:
        // - 'oid' is the stable user ID
        // - 'email' is often empty; 'preferred_username' contains the email
        const oid = (profile as any).oid || profile.sub || token.sub || "";
        const email = profile.email || (profile as any).preferred_username || (token as any).email || "";
        const name = profile.name || (token as any).name || email.split("@")[0] || "";

        console.log("[OpenSnek] JWT callback profile:", JSON.stringify({ oid, email, name, profileKeys: Object.keys(profile) }));

        token.azure_oid = oid;
        token.email = email;
        token.name = name;
        token.role = "student"; // Default, overridden by backend

        // Upsert user in OpenSnek backend and get role
        try {
          const apiBase =
            process.env.NEXT_PUBLIC_API_BASE ||
            `http://localhost:${process.env.BACKEND_PORT || 8001}`;
          const res = await fetch(
            `${apiBase}/api/v1/opensnek/auth/callback`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                azure_oid: oid,
                sub: token.sub,
                email: email,
                name: name,
                access_token: account.access_token,
              }),
            },
          );
          if (!res.ok) {
            const errText = await res.text();
            console.error("[OpenSnek] Auth callback failed:", res.status, errText);
          } else {
            const data = await res.json();
            token.role = data.role;
            console.log("[OpenSnek] User synced, role:", data.role);
          }
        } catch (e) {
          console.warn("[OpenSnek] Failed to sync user with backend:", e);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.azure_oid = token.azure_oid as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
