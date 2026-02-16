// API configuration and utility functions

// Backend URL for direct connections (WebSocket, server-side)
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE ||
  (() => {
    if (typeof window !== "undefined") {
      // Fallback: use same origin (works with Next.js rewrites proxy)
      return "";
    }
    return "http://localhost:8001";
  })();

// For REST API calls from the browser, use relative URLs so they go through
// the Next.js rewrite proxy (same origin = cookies included automatically).
// For server-side calls, use the full backend URL.
export const API_BASE_URL =
  typeof window !== "undefined" ? "" : BACKEND_URL;

/**
 * Construct a full API URL from a path.
 * In the browser, returns a relative URL (e.g., '/api/v1/knowledge/list')
 * so the request goes through the Next.js proxy and includes auth cookies.
 * On the server, returns the full backend URL.
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  return `${base}${normalizedPath}`;
}

/**
 * Construct a WebSocket URL from a path.
 * WebSocket connections always go directly to the backend (not proxied).
 */
export function wsUrl(path: string): string {
  // WebSocket needs the actual backend URL, not the proxy
  const backendBase = BACKEND_URL || `http://localhost:8001`;
  const base = backendBase
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  return `${normalizedBase}${normalizedPath}`;
}
