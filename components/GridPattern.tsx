import React from "react";

/**
 * Props for the GridPattern component
 */
export interface GridPatternProps {
  className?: string;
  size?: number;
  opacity?: string;
}

/**
 * GridPattern Component
 *
 * Displays a subtle grid pattern overlay.
 * Can be reused throughout the app for consistent background patterns.
 */
export const GridPattern: React.FC<GridPatternProps> = ({
  className = "",
  size = 32,
  opacity = "08",
}) => {
  // Convert opacity string (e.g., "08") to decimal (e.g., 0.08)
  // "08" in hex context means 0x08 = 8/255 ≈ 0.031
  const opacityValue = parseInt(opacity, 16) / 255;
  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, ${opacityValue}) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, ${opacityValue}) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
};
