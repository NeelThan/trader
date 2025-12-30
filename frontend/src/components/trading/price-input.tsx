"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PriceInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  precision?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export function PriceInput({
  label,
  value,
  onChange,
  placeholder = "0.00000",
  precision = 5,
  min,
  max,
  disabled = false,
  error,
  className,
}: PriceInputProps) {
  const inputId = React.useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string
    if (inputValue === "") {
      onChange("");
      return;
    }

    // Allow partial decimal input (e.g., "1." or ".5")
    if (/^-?\d*\.?\d*$/.test(inputValue)) {
      // Validate precision if complete number
      const parts = inputValue.split(".");
      if (parts[1] && parts[1].length > precision) {
        return;
      }
      onChange(inputValue);
    }
  };

  const handleBlur = () => {
    if (value === "" || value === "." || value === "-") {
      return;
    }

    let numValue = parseFloat(value);

    if (isNaN(numValue)) {
      onChange("");
      return;
    }

    // Clamp to min/max
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    if (max !== undefined && numValue > max) {
      numValue = max;
    }

    // Format to precision
    onChange(numValue.toFixed(precision));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "font-mono",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
