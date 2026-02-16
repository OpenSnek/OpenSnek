"use client";

/**
 * Course context — manages enrolled courses and active course selection.
 *
 * When a course is selected, its knowledge base name is synced to
 * GlobalContext so all DeepTutor features use the correct KB.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api";

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  kb_name: string | null;
  enrollment_code: string;
  professor_id: string;
  professor_name: string | null;
  created_at: string;
  is_active: boolean;
  enrolled_count: number | null;
}

interface CourseContextType {
  courses: Course[];
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;
  refreshCourses: () => Promise<void>;
  isLoading: boolean;
}

const CourseContext = createContext<CourseContextType>({
  courses: [],
  activeCourse: null,
  setActiveCourse: () => {},
  refreshCourses: async () => {},
  isLoading: false,
});

const ACTIVE_COURSE_KEY = "opensnek-active-course-id";

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourseState] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCourses = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/opensnek/courses"), {
        credentials: "include",
      });
      if (res.ok) {
        const data: Course[] = await res.json();
        setCourses(data);

        // Restore active course from localStorage
        if (typeof window !== "undefined") {
          const storedId = localStorage.getItem(ACTIVE_COURSE_KEY);
          if (storedId) {
            const found = data.find((c) => c.id === storedId);
            if (found) {
              setActiveCourseState(found);
            } else if (data.length > 0) {
              // Stored course not found, pick first
              setActiveCourseState(data[0]);
              localStorage.setItem(ACTIVE_COURSE_KEY, data[0].id);
            }
          } else if (data.length > 0) {
            setActiveCourseState(data[0]);
            localStorage.setItem(ACTIVE_COURSE_KEY, data[0].id);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch courses:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  const setActiveCourse = (course: Course | null) => {
    setActiveCourseState(course);
    if (typeof window !== "undefined") {
      if (course) {
        localStorage.setItem(ACTIVE_COURSE_KEY, course.id);
      } else {
        localStorage.removeItem(ACTIVE_COURSE_KEY);
      }
    }
  };

  return (
    <CourseContext.Provider
      value={{
        courses,
        activeCourse,
        setActiveCourse,
        refreshCourses,
        isLoading,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export const useCourse = () => useContext(CourseContext);
