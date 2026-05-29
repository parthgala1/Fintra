"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PercentageEditorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function PercentageEditor({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.01,
  disabled = false,
}: PercentageEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));

  // Keep the displayed value in sync with upstream changes when not editing.
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  const handleChange = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    setLocalValue(String(clamped));
    onChange(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleInputBlur = () => {
    const numValue = Number.parseFloat(localValue);
    if (Number.isFinite(numValue)) {
      handleChange(numValue);
    } else {
      setLocalValue(String(value));
    }
    setIsFocused(false);
  };

  const handleIncrement = () => {
    handleChange(value + step);
  };

  const handleDecrement = () => {
    handleChange(Math.max(min, value - step));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        onMouseDown={(e) => e.preventDefault()}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="Decrease percentage"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={isFocused ? localValue : value.toFixed(2)}
        onChange={handleInputChange}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(String(value));
        }}
        onBlur={handleInputBlur}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleInputBlur();
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            handleIncrement();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            handleDecrement();
          }
        }}
        disabled={disabled}
        className="w-20 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-center text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label="Percentage value"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        onMouseDown={(e) => e.preventDefault()}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="Increase percentage"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>

      <span className="text-xs text-slate-400 ml-1">%</span>
    </div>
  );
}
