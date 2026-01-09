import React from "react";
import { Check, X } from "lucide-react";

/**
 * Props for the ApiKeyInput component
 */
export interface ApiKeyInputProps {
  providerName: string;
  providerIcon?: React.ComponentType<{ className?: string }>;
  hasKey: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  disabled?: boolean;
}

/**
 * ApiKeyInput Component
 *
 * An input field for API keys with save/delete functionality.
 * Can be reused throughout the app for API key management.
 */
export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  providerName,
  providerIcon: ProviderIcon,
  hasKey,
  value,
  onChange,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  disabled = false,
}) => {
  const canSave = !hasKey && value?.trim() && !isSaving && !disabled;
  const canDelete = hasKey && onDelete && !isDeleting && !disabled;

  return (
    <div className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        {ProviderIcon && <ProviderIcon className="w-5 h-5 text-white" />}
        <p className="text-base font-medium text-white">{providerName}</p>
      </div>
      {hasKey ? (
        <div className="relative flex items-center">
          <div className="flex-1 p-3 pr-12 bg-black/40 border border-white/10 rounded-xl text-sm text-white/30">
            ••••••••••••••••••••
          </div>
          {canDelete && (
            <button
              onClick={onDelete}
              className="absolute right-2 w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete API key"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex items-center">
          <input
            type="password"
            placeholder={`Enter ${providerName} API key`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 p-3 pr-12 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 transition-all"
            disabled={isSaving || disabled}
          />
          {canSave && (
            <button
              onClick={onSave}
              className="absolute right-2 w-8 h-8 flex items-center justify-center text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
              title="Save API key"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
