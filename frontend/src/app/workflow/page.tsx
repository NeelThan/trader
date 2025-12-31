"use client";

import { useState, useCallback, useEffect } from "react";
import { WorkflowStepper, WorkflowDashboard } from "@/components/workflow";
import { useWorkflowManager } from "@/hooks/use-workflow-manager";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ViewMode = "dashboard" | "workflow";

export default function WorkflowPage() {
  const {
    hasActiveWorkflow,
    activeWorkflowSummary,
    createWorkflow,
    setActiveWorkflow,
  } = useWorkflowManager();

  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration - intentional mount detection and state sync
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional hydration sync
    setIsHydrated(true);
    // Update view mode based on active workflow after hydration
    if (hasActiveWorkflow) {
      setViewMode("workflow");
    }
  }, [hasActiveWorkflow]);

  const handleSelectWorkflow = useCallback((id: string) => {
    setActiveWorkflow(id);
    setViewMode("workflow");
  }, [setActiveWorkflow]);

  const handleCreateWorkflow = useCallback(() => {
    createWorkflow();
    setViewMode("workflow");
  }, [createWorkflow]);

  const handleBackToDashboard = useCallback(() => {
    setViewMode("dashboard");
  }, []);

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            {viewMode === "workflow" ? (
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>All Workflows</span>
              </button>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {viewMode === "dashboard"
                ? "Trading Workflows"
                : activeWorkflowSummary?.name ?? "Trading Workflow"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chart">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Open Chart
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {viewMode === "dashboard" ? (
          <div className="container py-6 px-4">
            <WorkflowDashboard
              onSelectWorkflow={handleSelectWorkflow}
              onCreateWorkflow={handleCreateWorkflow}
            />
          </div>
        ) : (
          <WorkflowStepper
            showPhases={true}
            className="flex-1"
            onBackToDashboard={handleBackToDashboard}
          />
        )}
      </main>
    </div>
  );
}
