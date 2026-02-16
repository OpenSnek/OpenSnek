/**
 * NextAuth.js v5 API route handler.
 * Handles /api/auth/* endpoints (sign-in, sign-out, callback, session).
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
