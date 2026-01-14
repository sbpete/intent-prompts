import React from "react";

/**
 * Props for the PageHeading component
 */
export interface PageHeadingProps {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

/**
 * PageHeading Component
 *
 * Displays a page title and optional description.
 * Can be reused throughout the app for consistent page headers.
 */
export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  description,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
}) => {
  return (
    <div className={`text-center ${className}`}>
      <h1
        className={`text-4xl text-white mb-3 tracking-tight ${titleClassName}`}
      >
        {title}
      </h1>
      {description && (
        <p className={`text-gray-400 text-sm ${descriptionClassName}`}>
          {description}
        </p>
      )}
    </div>
  );
};
