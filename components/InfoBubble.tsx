import React from "react";

/**
 * Props for the InfoBubble component
 */
export interface InfoBubbleProps {
  number: number;
  title: string;
  description: string;
  className?: string;
}

/**
 * InfoBubble Component
 *
 * Displays a step with a numbered badge and information in a styled bubble.
 * Can be reused throughout the app for displaying numbered steps or information items.
 */
export const InfoBubble: React.FC<InfoBubbleProps> = ({
  number,
  title,
  description,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-row items-center gap-4 p-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 backdrop-blur-sm mx-4 ${className}`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-400/40 flex items-center justify-center shadow-lg shadow-orange-500/20">
        <h1 className="text-orange-400 text-lg font-bold">{number}</h1>
      </div>
      <div className="text-left">
        <p className="text-white text-lg mb-1">{title}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
};
