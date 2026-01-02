"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useWorkflowManager } from "@/hooks/use-workflow-manager";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  action?: "new-trade"; // Special action for items that need custom behavior
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    description: "Overview",
  },
  {
    label: "New Trade",
    href: "/workflow",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    description: "Start new workflow",
    action: "new-trade",
  },
  {
    label: "Workflows",
    href: "/workflow",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    description: "View all workflows",
  },
  {
    label: "Chart",
    href: "/chart",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    description: "Technical analysis",
  },
  {
    label: "Chart Pro",
    href: "/chart-pro",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    description: "Multi-TF workflow",
  },
  {
    label: "Trend Analysis",
    href: "/trend-analysis",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    description: "Multi-timeframe",
  },
  {
    label: "Journal",
    href: "/journal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    description: "Trade history",
  },
  {
    label: "Position Sizing",
    href: "/position-sizing",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: "Risk calculator",
  },
  {
    label: "Timeframes",
    href: "/timeframes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "TF reference",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    description: "Preferences",
  },
];

const STORAGE_KEY = "trader-sidenav-collapsed";

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { startNewTrade } = useWorkflowManager();

  // Start with default collapsed state, will sync from localStorage after mount
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: hydrating from localStorage on mount
      setIsCollapsed(stored === "true");
    }
    setIsHydrated(true);
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = useCallback(() => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  }, [isCollapsed]);

  // Toggle mobile menu
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close mobile menu (called on navigation)
  const closeMobileMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle new trade action
  const handleNewTrade = useCallback(() => {
    closeMobileMenu();
    startNewTrade();
    router.push("/workflow");
  }, [closeMobileMenu, startNewTrade, router]);

  // Prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Hamburger button - fixed position */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleOpen}
        className="fixed top-3 left-3 z-50 lg:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border z-40 transition-all duration-300 ease-in-out",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, collapsed or expanded
          "lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border">
          {!isCollapsed && (
            <span className="font-semibold text-lg hidden lg:block">Trader</span>
          )}
          <span className="font-semibold text-lg lg:hidden">Trader</span>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden lg:flex"
            aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <svg
              className={cn("w-5 h-5 transition-transform", isCollapsed && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100%-7rem)]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            const itemContent = (
              <>
                <span className={cn(isActive && "text-primary")}>
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "flex-1 transition-opacity text-left",
                    isCollapsed && "lg:hidden"
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
              </>
            );

            const itemClassName = cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-primary/10 text-primary",
              isCollapsed && "lg:justify-center lg:px-2"
            );

            // Use button for items with special actions
            if (item.action === "new-trade") {
              return (
                <button
                  key={item.label}
                  onClick={handleNewTrade}
                  className={itemClassName}
                  title={isCollapsed ? item.label : undefined}
                >
                  {itemContent}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={itemClassName}
                title={isCollapsed ? item.label : undefined}
                onClick={closeMobileMenu}
              >
                {itemContent}
              </Link>
            );
          })}
        </nav>

        {/* Footer with theme toggle */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-border bg-card">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              isCollapsed && "lg:justify-center lg:px-2"
            )}
          >
            <ThemeToggle />
            <span
              className={cn(
                "text-sm text-muted-foreground",
                isCollapsed && "lg:hidden"
              )}
            >
              Theme
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

// Layout wrapper that adds padding for the sidebar
export function SideNavLayout({ children }: { children: React.ReactNode }) {
  // Start with default collapsed state, will sync from localStorage after mount
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Initial hydration from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: hydrating from localStorage on mount
      setIsCollapsed(stored === "true");
    }
    setIsHydrated(true);

    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIsCollapsed(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);

    // Poll for same-tab updates (since storage event doesn't fire for same tab)
    const intervalId = setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed((prev) => {
          const newValue = stored === "true";
          return prev !== newValue ? newValue : prev;
        });
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(intervalId);
    };
  }, []);

  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <>
      <SideNav />
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          // Mobile: no left margin, but add padding for hamburger button
          "pl-0 pt-14 lg:pt-0",
          // Desktop: add left margin for sidebar
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        {children}
      </div>
    </>
  );
}
