"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkHealth } from "@/lib/api";

type BackendStatusProps = {
  useBackend: boolean;
  onToggle: () => void;
};

export function BackendStatus({ useBackend, onToggle }: BackendStatusProps) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    async function check() {
      setIsChecking(true);
      try {
        await checkHealth();
        setIsAvailable(true);
      } catch {
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }
    check();
  }, []);

  const statusBadge = isChecking ? (
    <Badge variant="secondary">Checking...</Badge>
  ) : isAvailable ? (
    <Badge className="bg-green-500/20 text-green-400 border-transparent">
      Backend Online
    </Badge>
  ) : (
    <Badge className="bg-red-500/20 text-red-400 border-transparent">
      Backend Offline
    </Badge>
  );

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Fibonacci API:</span>
        {statusBadge}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={useBackend ? "default" : "outline"}
          size="sm"
          onClick={onToggle}
          disabled={!isAvailable}
          title={
            !isAvailable
              ? "Backend is not available - using client-side calculation"
              : useBackend
              ? "Using backend API for Fibonacci calculations"
              : "Using client-side Fibonacci calculations"
          }
        >
          {useBackend ? "Backend API" : "Client-side"}
        </Button>
      </div>

      {!isAvailable && (
        <span className="text-xs text-muted-foreground">
          Start backend: <code className="bg-muted px-1 rounded">uvicorn trader.main:app --reload</code>
        </span>
      )}
    </div>
  );
}
