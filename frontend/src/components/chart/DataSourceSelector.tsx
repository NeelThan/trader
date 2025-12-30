"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataSource } from "@/lib/chart-constants";

type DataSourceSelectorProps = {
  dataSource: DataSource;
  onSelect: (source: DataSource) => void;
  isLoading: boolean;
  error: string | null;
};

export function DataSourceSelector({
  dataSource,
  onSelect,
  isLoading,
  error,
}: DataSourceSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-2">Data Source:</span>
      <Button
        variant={dataSource === "simulated" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("simulated")}
      >
        Simulated
      </Button>
      <Button
        variant={dataSource === "yahoo" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("yahoo")}
      >
        Yahoo Finance
      </Button>
      {isLoading && (
        <div className="flex items-center gap-2 ml-2 text-muted-foreground">
          <Spinner size="sm" />
          <span className="text-sm">Loading...</span>
        </div>
      )}
      {error && (
        <span className="text-sm text-red-500 ml-2">Error: {error}</span>
      )}
    </div>
  );
}
