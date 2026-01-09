import React from "react";

/**
 * Props for the AnimatedGradientBackground component
 */
export interface AnimatedGradientBackgroundProps {
  className?: string;
  colors?: {
    from?: string;
    via?: string;
    to?: string;
  };
  pulseDuration?: string;
}

/**
 * AnimatedGradientBackground Component
 *
 * Provides an animated gradient background with pulse effect.
 * Can be reused throughout the app for consistent background styling.
 */
export const Background: React.FC<AnimatedGradientBackgroundProps> = ({
  className = "",
}) => {
  return (
    <>
      <div className={`absolute inset-0 bg-pink-500/10 ${className}`} />
    </>
  );
};
