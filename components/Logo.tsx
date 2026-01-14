import React from "react";

/**
 * Props for the Logo component
 */
export interface LogoProps {
  src?: string;
  alt?: string;
  className?: string;
  size?: number;
}

/**
 * Logo Component
 *
 * Displays the application logo.
 * Can be reused throughout the app for consistent branding.
 */
export const Logo: React.FC<LogoProps> = ({
  src = "/logo.png",
  alt = "Intent Prompts",
  className = "",
  size = 80,
}) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <img
        src={src}
        alt={alt}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};
