"use client";

import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number;
  color: string;
  label?: string;
  size?: number;
  className?: string;
}

export function CircularProgress({
  value,
  color,
  label,
  size = 80,
  className = "",
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedValue(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label={label ? `${label}: ${clamped}%` : `${clamped}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        role="img"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-base sm:text-lg font-bold leading-none tabular-nums"
          style={{ color }}
        >
          {clamped}%
        </span>
        {label && (
          <span
            className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide mt-0.5 text-center px-1 line-clamp-1 max-w-full"
            style={{ color }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
