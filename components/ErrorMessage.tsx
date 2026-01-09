import React from "react";

/**
 * Props for the ErrorMessage component
 */
export interface ErrorMessageProps {
  message: string;
  className?: string;
}

/**
 * ErrorMessage Component
 *
 * Displays error messages in a styled container.
 * Can be reused throughout the app for consistent error display.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = "",
}) => {
  if (!message) return null;

  return (
    <div
      className={`p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-sm ${className}`}
    >
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
};
