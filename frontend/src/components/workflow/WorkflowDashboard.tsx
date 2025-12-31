"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWorkflowManager,
  type WorkflowSummary,
  type WorkflowStatus,
} from "@/hooks/use-workflow-manager";
import { WORKFLOW_STEPS } from "@/hooks/use-workflow-state";

type WorkflowDashboardProps = {
  onSelectWorkflow: (id: string) => void;
  onCreateWorkflow: () => void;
  className?: string;
};

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  active: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const DIRECTION_CONFIG: Record<string, { label: string; color: string }> = {
  GO_LONG: { label: "Long", color: "text-green-500" },
  GO_SHORT: { label: "Short", color: "text-red-500" },
  STAND_ASIDE: { label: "Stand Aside", color: "text-yellow-500" },
};

function WorkflowCard({
  workflow,
  isActive,
  progress,
  validation,
  onSelect,
  onDelete,
  onDuplicate,
  onCancel,
}: {
  workflow: WorkflowSummary;
  isActive: boolean;
  progress: number;
  validation: { valid: boolean; issues: string[] };
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}) {
  const statusConfig = STATUS_CONFIG[workflow.status];
  const directionConfig = DIRECTION_CONFIG[workflow.tradeDirection] ?? { label: workflow.tradeDirection, color: "text-muted-foreground" };
  const currentStepInfo = WORKFLOW_STEPS.find((s) => s.number === workflow.currentStep);

  return (
    <Card
      className={cn(
        "relative transition-all cursor-pointer hover:border-primary/50",
        isActive && "border-primary ring-1 ring-primary/20"
      )}
      onClick={onSelect}
    >
      {isActive && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
          Active
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{workflow.name}</CardTitle>
            <CardDescription className="text-xs">
              Created {new Date(workflow.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Symbol and Direction */}
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono font-semibold">{workflow.symbol}</span>
          <span className={cn("font-medium", directionConfig.color)}>
            {directionConfig.label}
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {workflow.currentStep} of {workflow.totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          {currentStepInfo && (
            <p className="text-xs text-muted-foreground">{currentStepInfo.title}</p>
          )}
        </div>

        {/* Trade Details (if available) */}
        {workflow.entryPrice && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Entry</span>
              <p className="font-mono">${workflow.entryPrice.toFixed(2)}</p>
            </div>
            {workflow.stopLoss && (
              <div>
                <span className="text-muted-foreground">Stop</span>
                <p className="font-mono text-red-400">${workflow.stopLoss.toFixed(2)}</p>
              </div>
            )}
            {workflow.riskRewardRatio && (
              <div>
                <span className="text-muted-foreground">R:R</span>
                <p className="font-mono">{workflow.riskRewardRatio.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* Validation Issues */}
        {!validation.valid && validation.issues.length > 0 && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
            <p className="font-medium text-yellow-500 mb-1">Issues:</p>
            <ul className="list-disc list-inside text-muted-foreground">
              {validation.issues.slice(0, 2).map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
              {validation.issues.length > 2 && (
                <li>+{validation.issues.length - 2} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="flex-1" onClick={onSelect}>
            {workflow.status === "completed" ? "View" : "Continue"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
          {workflow.status !== "completed" && workflow.status !== "cancelled" && (
            <Button variant="ghost" size="sm" onClick={onCancel} title="Cancel">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkflowDashboard({
  onSelectWorkflow,
  onCreateWorkflow,
  className,
}: WorkflowDashboardProps) {
  const {
    workflows,
    pendingWorkflows,
    completedWorkflows,
    activeWorkflowSummary,
    deleteWorkflow,
    duplicateWorkflow,
    cancelWorkflow,
    setActiveWorkflow,
    getProgress,
    getValidation,
  } = useWorkflowManager();

  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const filteredWorkflows = filter === "all"
    ? workflows
    : filter === "pending"
      ? pendingWorkflows
      : completedWorkflows;

  const handleSelect = (id: string) => {
    setActiveWorkflow(id);
    onSelectWorkflow(id);
  };

  const handleDelete = () => {
    if (deleteDialogId) {
      deleteWorkflow(deleteDialogId);
      setDeleteDialogId(null);
    }
  };

  const handleCancel = () => {
    if (cancelDialogId) {
      cancelWorkflow(cancelDialogId);
      setCancelDialogId(null);
    }
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicateWorkflow(id);
    if (newId) {
      onSelectWorkflow(newId);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Trading Workflows</h2>
          <p className="text-sm text-muted-foreground">
            {pendingWorkflows.length} pending, {completedWorkflows.length} completed
          </p>
        </div>
        <Button onClick={onCreateWorkflow}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workflow
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending" : "Completed"}
            <Badge variant="secondary" className="ml-2">
              {f === "all" ? workflows.length : f === "pending" ? pendingWorkflows.length : completedWorkflows.length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Workflow Grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">No workflows found</h3>
              <p className="text-sm text-muted-foreground">
                {filter === "all"
                  ? "Start your first trading workflow"
                  : filter === "pending"
                    ? "No pending workflows"
                    : "No completed workflows yet"}
              </p>
            </div>
            <Button onClick={onCreateWorkflow}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Workflow
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              isActive={activeWorkflowSummary?.id === workflow.id}
              progress={getProgress(workflow.id)}
              validation={getValidation(workflow.id)}
              onSelect={() => handleSelect(workflow.id)}
              onDelete={() => setDeleteDialogId(workflow.id)}
              onDuplicate={() => handleDuplicate(workflow.id)}
              onCancel={() => setCancelDialogId(workflow.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workflow
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelDialogId} onOpenChange={() => setCancelDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the workflow as cancelled. You can still view or duplicate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-yellow-500 hover:bg-yellow-600">
              Cancel Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
