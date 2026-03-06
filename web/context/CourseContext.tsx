"use client";

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
  refreshCourses: () => Promise<void>;
  isLoading: boolean;
}

const CourseContext = createContext<CourseContextType>({
  courses: [],
  refreshCourses: async () => {},
  isLoading: false,
});

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
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

  return (
    <CourseContext.Provider value={{ courses, refreshCourses, isLoading }}>
      {children}
    </CourseContext.Provider>
  );
}

export const useCourse = () => useContext(CourseContext);
