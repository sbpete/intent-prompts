import React from "react";
import { LucideIcon } from "lucide-react";

/**
 * Props for the CTAButton component
 */
export interface CTAButtonProps {
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  className?: string;
  variant?: "primary" | "secondary";
  helperText?: string;
}

/**
 * CTAButton Component
 *
 * A prominent call-to-action button with nested borders and gradient styling.
 * Can be reused throughout the app for primary actions.
 */
export const CTAButton: React.FC<CTAButtonProps> = ({
  onClick,
  label,
  icon: Icon,
  className = "",
  variant = "primary",
  helperText,
}) => {
  const gradientClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-orange-400 to-pink-400 hover:shadow-2xl hover:shadow-orange-400/20"
      : "bg-gradient-to-r from-gray-400 to-gray-500 hover:shadow-2xl hover:shadow-gray-400/20";

  return (
    <div className={`w-full max-w-md mx-auto relative ${className}`}>
      <button
        onClick={onClick}
        className="w-full rounded-full border border-white/10 px-2 py-2 hover:scale-105 transition-all duration-300 ease-out"
        style={{ overflow: "visible" }}
        tabIndex={0}
        type="button"
      >
        <div className="w-full h-full rounded-full border border-white/20 px-2 py-2">
          <div className="w-full h-full rounded-full border border-white/30 px-2 py-2">
            <div
              className={`group w-full py-5 rounded-full transition-all duration-300 ease-out flex items-center justify-center relative z-10 ${gradientClasses}`}
            >
              {Icon && (
                <div className="absolute left-2 flex items-center justify-center bg-white rounded-full w-12 h-12 z-10">
                  <Icon className="w-5 h-5 text-black" />
                </div>
              )}
              <span
                className={`flex-1 flex justify-center z-10 ${
                  Icon ? "sm:ml-4" : ""
                }`}
              >
                <span className="text-white text-lg">{label}</span>
              </span>
            </div>
          </div>
        </div>
      </button>

      {helperText && (
        <p className="text-gray-500 text-sm mt-3 text-center">{helperText}</p>
      )}
    </div>
  );
};
