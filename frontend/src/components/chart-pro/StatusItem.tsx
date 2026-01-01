"use client";

/**
 * Status Item Component
 *
 * Displays a status indicator with label for workflow-style status tracking.
 * Shows different icons for done, pending, and in-progress states.
 */

export type StatusItemProps = {
  label: string;
  status: "done" | "pending" | "in-progress";
};

export function StatusItem({ label, status }: StatusItemProps) {
  return (
    <div className="flex items-center gap-2">
      {status === "done" && (
        <svg
          className="w-4 h-4 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {status === "pending" && (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      )}
      {status === "in-progress" && (
        <svg
          className="w-4 h-4 text-amber-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={4}
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}
