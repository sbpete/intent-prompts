import React from "react";
import { Check } from "lucide-react";

/**
 * Props for the ProviderRadio component
 */
export interface ProviderRadioProps {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  hasKey: boolean;
  onSelect: () => void;
}

/**
 * ProviderRadio Component
 *
 * A radio button-style component for selecting a provider.
 * Can be reused throughout the app for provider selection.
 */
export const ProviderRadio: React.FC<ProviderRadioProps> = ({
  id,
  name,
  icon: Icon,
  isSelected,
  hasKey,
  onSelect,
}) => {
  return (
    <label
      htmlFor={id}
      onClick={onSelect}
      className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all backdrop-blur-sm ${
        isSelected
          ? "border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-pink-500/10 shadow-lg shadow-orange-500/5"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? "border-orange-400 bg-gradient-to-r from-orange-400 to-pink-400"
              : hasKey
              ? "border-white/30"
              : "border-white/10"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        {Icon && (
          <Icon
            className={`w-5 h-5 ${!hasKey ? "text-white/40" : "text-white"}`}
          />
        )}
        <span
          className={`text-base ${!hasKey ? "text-white/40" : "text-white"}`}
        >
          {name}
        </span>
        {!hasKey && (
          <span className="text-xs text-white/30 px-2 py-1 rounded-full bg-white/5">
            No API key
          </span>
        )}
      </div>
      {isSelected && <Check className="w-5 h-5 text-orange-400" />}
    </label>
  );
};
