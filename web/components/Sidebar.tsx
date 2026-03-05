"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Home,
  History,
  BookOpen,
  PenTool,
  Calculator,
  Microscope,
  Edit3,
  Settings,
  Book,
  GraduationCap,
  Lightbulb,
  Github,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Check,
  X,
  LucideIcon,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Library,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useGlobal } from "@/context/GlobalContext";
import { useAuth } from "@/context/AuthContext";
import { useCourse } from "@/context/CourseContext";

const SIDEBAR_EXPANDED_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;

// Navigation item type
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

// All available navigation items (static reference)
const ALL_NAV_ITEMS: Record<string, { icon: LucideIcon; nameKey: string }> = {
  "/": { icon: Home, nameKey: "Home" },
  "/history": { icon: History, nameKey: "History" },
  "/knowledge": { icon: BookOpen, nameKey: "Knowledge Bases" },
  "/notebook": { icon: Book, nameKey: "Notebooks" },
  "/question": { icon: PenTool, nameKey: "Question Generator" },
  "/solver": { icon: Calculator, nameKey: "Smart Solver" },
  "/guide": { icon: GraduationCap, nameKey: "Guided Learning" },
  "/ideagen": { icon: Lightbulb, nameKey: "IdeaGen" },
  "/research": { icon: Microscope, nameKey: "Deep Research" },
  "/co_writer": { icon: Edit3, nameKey: "Co-Writer" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    sidebarDescription,
    setSidebarDescription,
    sidebarNavOrder,
    setSidebarNavOrder,
    setChatState,
  } = useGlobal();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { courses, activeCourse, setActiveCourse } = useCourse();
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Editable description state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescriptionValue, setEditingDescriptionValue] =
    useState(sidebarDescription);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dragGroup, setDragGroup] = useState<"start" | "learnResearch" | null>(
    null,
  );

  // Build navigation items from saved order - defined inside useMemo to properly capture dependencies
  const navGroups = useMemo(() => {
    const buildNavItems = (hrefs: string[]): NavItem[] => {
      return hrefs
        .filter((href) => ALL_NAV_ITEMS[href])
        .map((href) => ({
          name: t(ALL_NAV_ITEMS[href].nameKey),
          href,
          icon: ALL_NAV_ITEMS[href].icon,
        }));
    };

    return [
      {
        id: "start" as const,
        name: t("Workspace"),
        items: buildNavItems(sidebarNavOrder.start),
      },
      {
        id: "learnResearch" as const,
        name: t("Learn & Research"),
        items: buildNavItems(sidebarNavOrder.learnResearch),
      },
    ];
  }, [sidebarNavOrder, t]);

  // Handle description edit
  const handleDescriptionEdit = () => {
    setEditingDescriptionValue(sidebarDescription);
    setIsEditingDescription(true);
  };

  const handleDescriptionSave = () => {
    setSidebarDescription(
      editingDescriptionValue.trim() || t("✨ Your description here"),
    );
    setIsEditingDescription(false);
  };

  const handleDescriptionCancel = () => {
    setEditingDescriptionValue(sidebarDescription);
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDescriptionSave();
    } else if (e.key === "Escape") {
      handleDescriptionCancel();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
      descriptionInputRef.current.select();
    }
  }, [isEditingDescription]);

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    href: string,
    groupId: "start" | "learnResearch",
  ) => {
    setDraggedItem(href);
    setDragGroup(groupId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", href);
  };

  const handleDragOver = (
    e: React.DragEvent,
    href: string,
    groupId: "start" | "learnResearch",
  ) => {
    e.preventDefault();
    if (dragGroup !== groupId) return; // Only allow drag within same group
    if (draggedItem !== href) {
      setDragOverItem(href);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetHref: string,
    groupId: "start" | "learnResearch",
  ) => {
    e.preventDefault();
    if (!draggedItem || dragGroup !== groupId) return;

    const groupKey = groupId;
    const currentOrder = [...sidebarNavOrder[groupKey]];
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetHref);

    if (
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex !== targetIndex
    ) {
      // Remove dragged item and insert at new position
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedItem);

      setSidebarNavOrder({
        ...sidebarNavOrder,
        [groupKey]: currentOrder,
      });
    }

    setDraggedItem(null);
    setDragOverItem(null);
    setDragGroup(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDragGroup(null);
  };

  const currentWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_EXPANDED_WIDTH;

  return (
    <div
      className="relative flex-shrink-0 bg-slate-50/80 dark:bg-slate-800/80 h-full border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
      style={{ width: currentWidth }}
    >
      {/* Header */}
      <div
        className={`border-b border-slate-100 dark:border-slate-700 transition-all duration-300 ${
          sidebarCollapsed ? "px-2 py-3" : "px-4 py-3"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt={t("DeepTutor Logo")}
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <h1
                className={`font-bold text-slate-900 dark:text-slate-100 tracking-tight text-base whitespace-nowrap transition-all duration-300 ${
                  sidebarCollapsed
                    ? "opacity-0 w-0 overflow-hidden"
                    : "opacity-100"
                }`}
              >
                OpenSnek
              </h1>
            </div>
            <div
              className={`flex items-center gap-0.5 transition-all duration-300 ${
                sidebarCollapsed
                  ? "opacity-0 w-0 overflow-hidden"
                  : "opacity-100"
              }`}
            >
              {/* Collapse button */}
              <button
                onClick={toggleSidebar}
                className="text-slate-400 hover:text-green-600 dark:hover:text-[#8DBF5A] p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title={t("Collapse sidebar")}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
<a
                href="https://github.com/HKUDS/DeepTutor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title={t("View on GitHub")}
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Course Selector — only when authenticated and courses exist */}
      {isAuthenticated && courses.length > 0 && (
        <div
          className={`border-b border-slate-100 dark:border-slate-700 transition-all duration-300 ${
            sidebarCollapsed ? "px-2 py-2" : "px-2 py-2"
          }`}
        >
          <div className="relative">
            {/* Collapsed: icon only, same as other nav items */}
            {sidebarCollapsed ? (
              <button
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                className={`group w-full flex items-center justify-center p-2 rounded-md border transition-all duration-200 ${
                  activeCourse
                    ? "bg-white dark:bg-slate-700 shadow-sm border-slate-100 dark:border-slate-600"
                    : "border-transparent hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm hover:border-slate-100 dark:hover:border-slate-600"
                }`}
                title={activeCourse?.name || t("Select course")}
              >
                <Library
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    activeCourse
                      ? "text-green-600 dark:text-[#8DBF5A]"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-[#8DBF5A]"
                  }`}
                />
              </button>
            ) : (
              /* Expanded: exactly the same structure + classes as a nav item */
              <button
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                className={`group w-full flex items-center rounded-md border transition-all duration-200 gap-2.5 pl-2 pr-1.5 py-2 ${
                  activeCourse
                    ? "bg-white dark:bg-slate-700 text-green-700 dark:text-[#8DBF5A] shadow-sm border-slate-100 dark:border-slate-600"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-[#8DBF5A] hover:shadow-sm border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                }`}
              >
                <Library
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    activeCourse
                      ? "text-green-600 dark:text-[#8DBF5A]"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-[#8DBF5A]"
                  }`}
                />
                <span className="font-medium text-sm whitespace-nowrap flex-1 truncate text-left">
                  {activeCourse?.name || t("Courses")}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                    showCourseDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Dropdown */}
            {showCourseDropdown && (
              <div
                className={`absolute z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto ${
                  sidebarCollapsed
                    ? "left-full ml-2 top-0 min-w-[200px]"
                    : "left-0 right-0 top-full mt-1"
                }`}
              >
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCourse(c);
                      if (c.kb_name)
                        setChatState((prev) => ({
                          ...prev,
                          selectedKb: c.kb_name!,
                        }));
                      setShowCourseDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      activeCourse?.id === c.id
                        ? "text-green-700 dark:text-[#8DBF5A] font-medium bg-green-50/50 dark:bg-green-900/10"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="font-mono text-xs text-slate-400 mr-2">
                      {c.code}
                    </span>
                    {c.name}
                  </button>
                ))}
                <Link
                  href="/courses"
                  onClick={() => setShowCourseDropdown(false)}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 dark:text-[#8DBF5A] hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5 font-medium transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {t("All Courses")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={`flex-1 overflow-y-auto py-2 space-y-4 transition-all duration-300 ${
          sidebarCollapsed ? "px-2" : "px-2"
        }`}
      >
        {navGroups.map((group, idx) => (
          <div key={group.id}>
            {/* Group title - only show when expanded */}
            <div
              className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 truncate transition-all duration-300 ${
                sidebarCollapsed
                  ? "opacity-0 h-0 overflow-hidden px-0"
                  : "opacity-100 px-1"
              }`}
            >
              {group.name}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const isDragging = draggedItem === item.href;
                const isDragOver =
                  dragOverItem === item.href && dragGroup === group.id;

                return (
                  <div
                    key={item.href}
                    draggable={!sidebarCollapsed}
                    onDragStart={(e) =>
                      !sidebarCollapsed &&
                      handleDragStart(e, item.href, group.id)
                    }
                    onDragOver={(e) =>
                      !sidebarCollapsed &&
                      handleDragOver(e, item.href, group.id)
                    }
                    onDragLeave={handleDragLeave}
                    onDrop={(e) =>
                      !sidebarCollapsed && handleDrop(e, item.href, group.id)
                    }
                    onDragEnd={handleDragEnd}
                    className={`group relative ${isDragging ? "opacity-50" : ""} ${
                      isDragOver ? "border-t-2 border-[#8DBF5A]" : ""
                    }`}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-md border transition-all duration-200 ${
                        sidebarCollapsed
                          ? "justify-center p-2"
                          : "gap-2.5 pl-2 pr-1.5 py-2"
                      } ${
                        isActive
                          ? "bg-white dark:bg-slate-700 text-green-700 dark:text-[#8DBF5A] shadow-sm border-slate-100 dark:border-slate-600"
                          : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-[#8DBF5A] hover:shadow-sm border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                      }`}
                      onMouseEnter={() =>
                        sidebarCollapsed && setShowTooltip(item.href)
                      }
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors ${
                          isActive
                            ? "text-green-600 dark:text-[#8DBF5A]"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-[#8DBF5A]"
                        }`}
                      />
                      <span
                        className={`font-medium text-sm whitespace-nowrap flex-1 transition-all duration-300 ${
                          sidebarCollapsed
                            ? "opacity-0 w-0 overflow-hidden"
                            : "opacity-100"
                        }`}
                      >
                        {item.name}
                      </span>
                      {/* Drag handle - only show when expanded and hovering, now on right */}
                      <div
                        className={`flex-shrink-0 transition-all duration-300 ${
                          sidebarCollapsed
                            ? "w-0 opacity-0 overflow-hidden"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing" />
                      </div>
                    </Link>
                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && showTooltip === item.href && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                        {item.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Divider between groups in collapsed mode */}
            {sidebarCollapsed && idx < navGroups.length - 1 && (
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-1" />
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 transition-all duration-300 ${
          sidebarCollapsed ? "px-2 py-2" : "px-2 py-2"
        }`}
      >
        {/* Professor Dashboard link — same structure and classes as Settings */}
        {isAuthenticated &&
          (user?.role === "professor" || user?.role === "admin") && (
            <div className="relative mb-1">
              <Link
                href="/professor"
                className={`flex items-center rounded-md border transition-all duration-200 ${
                  sidebarCollapsed
                    ? "justify-center p-2"
                    : "gap-2.5 pl-2 pr-1.5 py-2"
                } ${
                  pathname.startsWith("/professor")
                    ? "bg-white dark:bg-slate-700 text-green-700 dark:text-[#8DBF5A] shadow-sm border-slate-100 dark:border-slate-600"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border-transparent"
                }`}
                onMouseEnter={() =>
                  sidebarCollapsed && setShowTooltip("/professor")
                }
                onMouseLeave={() => setShowTooltip(null)}
              >
                <LayoutDashboard
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    pathname.startsWith("/professor")
                      ? "text-green-600 dark:text-[#8DBF5A]"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`whitespace-nowrap flex-1 transition-all duration-300 ${
                    sidebarCollapsed
                      ? "opacity-0 w-0 overflow-hidden"
                      : "opacity-100"
                  }`}
                >
                  {t("Professor Dashboard")}
                </span>
              </Link>
              {sidebarCollapsed && showTooltip === "/professor" && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                  {t("Professor Dashboard")}
                </div>
              )}
            </div>
          )}

        {/* Settings */}
        <div className="relative">
          <Link
            href="/settings"
            className={`flex items-center rounded-md text-sm transition-all duration-200 ${
              sidebarCollapsed
                ? "justify-center p-2"
                : "gap-2.5 pl-2 pr-1.5 py-2"
            } ${
              pathname === "/settings"
                ? "bg-white dark:bg-slate-700 text-green-700 dark:text-[#8DBF5A] shadow-sm border border-slate-100 dark:border-slate-600"
                : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
            }`}
            onMouseEnter={() => sidebarCollapsed && setShowTooltip("/settings")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <Settings
              className={`w-5 h-5 flex-shrink-0 transition-colors ${
                pathname === "/settings"
                  ? "text-green-600 dark:text-[#8DBF5A]"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            />
            <span
              className={`whitespace-nowrap flex-1 transition-all duration-300 ${
                sidebarCollapsed
                  ? "opacity-0 w-0 overflow-hidden"
                  : "opacity-100"
              }`}
            >
              {t("Settings")}
            </span>
          </Link>
          {sidebarCollapsed && showTooltip === "/settings" && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
              {t("Settings")}
            </div>
          )}
        </div>

        {/* User info and sign out */}
        {isAuthenticated && user && (
          <div
            className={`mt-2 flex items-center rounded-md transition-all duration-200 ${
              sidebarCollapsed ? "justify-center p-2" : "gap-2.5 pl-2 pr-1.5 py-2"
            }`}
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {/* Name and role */}
            <div
              className={`flex-1 min-w-0 transition-all duration-300 ${
                sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}
            >
              <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                {user.role}
              </div>
            </div>
            {/* Sign out button */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ${
                sidebarCollapsed ? "hidden" : ""
              }`}
              title={t("Sign out")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expand/Collapse button at bottom */}
        <button
          onClick={toggleSidebar}
          className={`w-full mt-1 flex items-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-green-600 dark:hover:text-[#8DBF5A] hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-600 transition-all duration-200 ${
            sidebarCollapsed ? "justify-center p-2" : "gap-2.5 pl-2 pr-1.5 py-2"
          }`}
          title={sidebarCollapsed ? t("Expand sidebar") : t("Collapse sidebar")}
        >
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {sidebarCollapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </div>
          <span
            className={`text-sm whitespace-nowrap flex-1 transition-all duration-300 ${
              sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            {t("Collapse sidebar")}
          </span>
        </button>
      </div>
    </div>
  );
}
