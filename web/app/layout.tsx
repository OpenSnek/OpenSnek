import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { GlobalProvider } from "@/context/GlobalContext";
import ThemeScript from "@/components/ThemeScript";
import LayoutWrapper from "@/components/LayoutWrapper";
import { I18nClientBridge } from "@/i18n/I18nClientBridge";
import { AuthProvider } from "@/context/AuthContext";
import { CourseProvider } from "@/context/CourseContext";
import { ActivityReporter } from "@/components/ActivityReporter";
import { AppShell } from "@/components/AppShell";

// Use Inter font with swap display for better loading
const font = Inter({
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "OpenSnek",
  description: "AI-Powered University Learning Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={font.className}>
        <AuthProvider>
          <GlobalProvider>
            <I18nClientBridge>
              <CourseProvider>
                <LayoutWrapper>
                  <AppShell>{children}</AppShell>
                </LayoutWrapper>
                <ActivityReporter />
              </CourseProvider>
            </I18nClientBridge>
          </GlobalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
