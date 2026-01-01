"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWorkflowManager } from "@/hooks/use-workflow-manager";
import { cn } from "@/lib/utils";

type NewTradeButtonProps = {
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Button that starts a new trade workflow.
 * - If there's an active workflow in progress, it gets put to "pending" state
 * - Creates a new workflow and navigates to /workflow
 */
export function NewTradeButton({
  size = "sm",
  variant = "default",
  className,
  children,
}: NewTradeButtonProps) {
  const router = useRouter();
  const { startNewTrade } = useWorkflowManager();

  const handleClick = useCallback(() => {
    startNewTrade();
    router.push("/workflow");
  }, [startNewTrade, router]);

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      className={cn(className)}
    >
      {children ?? "New Trade"}
    </Button>
  );
}
