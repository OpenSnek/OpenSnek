"use client";

/**
 * ActivityReporter — invisible component that observes GlobalContext state
 * changes and reports completed activities to the OpenSnek backend.
 *
 * It watches for state transitions indicating that a feature interaction
 * has completed (e.g., solver finishes, chat response received) and
 * sends an activity log.
 *
 * This component renders nothing — it's placed in the layout tree
 * purely for its side effects.
 */

import { useEffect, useRef } from "react";
import { useGlobal } from "@/context/GlobalContext";
import { useCourse } from "@/context/CourseContext";
import { useAuth } from "@/context/AuthContext";
import { reportActivity } from "@/lib/activity";

export function ActivityReporter() {
  const { isAuthenticated } = useAuth();
  const { solverState, chatState, questionState, researchState } = useGlobal();
  const { activeCourse } = useCourse();

  // Track previous states to detect transitions
  const prevSolverSolving = useRef(false);
  const prevChatLoading = useRef(false);
  const prevQuestionStep = useRef("config");
  const prevResearchStatus = useRef("idle");

  // Solver: isSolving true → false (with messages = completion)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (
      prevSolverSolving.current &&
      !solverState.isSolving &&
      solverState.messages.length > 0
    ) {
      reportActivity({
        feature: "solver",
        topic: solverState.question,
        sessionId: solverState.sessionId || undefined,
        courseId: activeCourse?.id,
      });
    }
    prevSolverSolving.current = solverState.isSolving;
  }, [solverState.isSolving, isAuthenticated]);

  // Chat: isLoading true → false (with messages = response received)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (
      prevChatLoading.current &&
      !chatState.isLoading &&
      chatState.messages.length > 0
    ) {
      const lastUserMsg = [...chatState.messages]
        .reverse()
        .find((m) => m.role === "user");
      reportActivity({
        feature: "chat",
        topic: lastUserMsg?.content?.slice(0, 200),
        sessionId: chatState.sessionId || undefined,
        courseId: activeCourse?.id,
      });
    }
    prevChatLoading.current = chatState.isLoading;
  }, [chatState.isLoading, isAuthenticated]);

  // Question generation: step transitions to "result"
  useEffect(() => {
    if (!isAuthenticated) return;

    if (
      prevQuestionStep.current !== "result" &&
      questionState.step === "result" &&
      questionState.results.length > 0
    ) {
      reportActivity({
        feature: "question",
        topic: questionState.topic,
        courseId: activeCourse?.id,
        metadata: {
          count: questionState.results.length,
          mode: questionState.mode,
        },
      });
    }
    prevQuestionStep.current = questionState.step;
  }, [questionState.step, isAuthenticated]);

  // Research: status transitions to "completed"
  useEffect(() => {
    if (!isAuthenticated) return;

    if (
      prevResearchStatus.current !== "completed" &&
      researchState.status === "completed"
    ) {
      reportActivity({
        feature: "research",
        topic: researchState.topic,
        courseId: activeCourse?.id,
      });
    }
    prevResearchStatus.current = researchState.status;
  }, [researchState.status, isAuthenticated]);

  // Render nothing
  return null;
}
