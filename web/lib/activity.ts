/**
 * Activity reporting utility for OpenSnek.
 *
 * Sends activity logs to the backend after WebSocket interactions complete.
 * Failures are silently ignored — activity logging should never block UX.
 */

import { apiUrl } from "@/lib/api";

interface ActivityParams {
  feature: string;
  topic?: string;
  sessionId?: string;
  courseId?: string;
  metadata?: Record<string, any>;
}

export async function reportActivity(params: ActivityParams): Promise<void> {
  try {
    await fetch(apiUrl("/api/v1/opensnek/activity"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        feature: params.feature,
        topic: params.topic?.slice(0, 500), // Truncate long topics
        session_id: params.sessionId,
        course_id: params.courseId,
        metadata: params.metadata || {},
      }),
    });
  } catch {
    // Silent failure — activity logging should never block UX
  }
}
