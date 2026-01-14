import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Key,
  Radio,
  AlertCircle,
} from "lucide-react";
import { SiOpenai, SiClaude, SiGooglegemini } from "react-icons/si";
import { ErrorMessage, ProviderRadio, ApiKeyInput } from "./components";
import { X } from "lucide-react";

// Mock types for demonstration
type ProviderId = "openai" | "anthropic" | "google";
type ProviderApiKeys = Record<ProviderId, string>;

// Anthropic logo component (custom SVG representing Anthropic's "A" logo)
const AnthropicIcon = ({ className }: { className?: string }) => (
  <SiClaude className={className} />
);

interface Provider {
  id: ProviderId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsProps {
  onClose: () => void;
  sendMessage: (message: any) => Promise<any>;
}

const providers: Provider[] = [
  { id: "openai", name: "ChatGPT", icon: SiOpenai },
  { id: "anthropic", name: "Claude", icon: AnthropicIcon },
  { id: "google", name: "Gemini", icon: SiGooglegemini },
];

export const Settings: React.FC<SettingsProps> = ({ onClose, sendMessage }) => {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderId>("openai");
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>(
    {} as ProviderApiKeys
  );
  const [newApiKeys, setNewApiKeys] = useState<Record<ProviderId, string>>({
    openai: "",
    anthropic: "",
    google: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<ProviderId | null>(null);
  const [deleting, setDeleting] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await sendMessage({ action: "getSettings" });
        if (response.success) {
          const loadedApiKeys = (response.providerApiKeys ||
            {}) as ProviderApiKeys;
          setApiKeys(loadedApiKeys);

          let loadedProvider = response.selectedProvider as
            | ProviderId
            | undefined;

          if (!loadedProvider || !loadedApiKeys[loadedProvider]) {
            const providerWithKey = providers.find((p) => loadedApiKeys[p.id]);
            if (providerWithKey) {
              loadedProvider = providerWithKey.id;
            }
          }

          if (loadedProvider) {
            setSelectedProvider(loadedProvider);
          }
        } else {
          setError((response as any).error || "Failed to load settings");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load settings"
        );
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [sendMessage]);

  const handleProviderSelect = async (providerId: ProviderId) => {
    try {
      setError(null);
      const response = await sendMessage({
        action: "setSelectedProvider",
        providerId,
      });
      if (response.success) {
        setSelectedProvider(providerId);
      } else {
        setError(response.error || "Failed to set provider");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set provider");
    }
  };

  const handleSaveApiKey = async (providerId: ProviderId) => {
    const apiKey = newApiKeys[providerId]?.trim();
    if (!apiKey) {
      setError("Please enter an API key");
      return;
    }

    try {
      setSaving(providerId);
      setError(null);
      const response = await sendMessage({
        action: "setProviderApiKey",
        providerId,
        apiKey,
      });
      if (response.success) {
        const updatedKeys = { ...apiKeys, [providerId]: apiKey };
        setApiKeys(updatedKeys);
        setNewApiKeys((prev) => ({ ...prev, [providerId]: "" }));
        // If this is the first API key, select this provider
        if (Object.keys(apiKeys).length === 0) {
          await handleProviderSelect(providerId);
        }
      } else {
        setError(response.error || "Failed to save API key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteApiKey = async (providerId: ProviderId) => {
    if (
      !confirm(
        `Are you sure you want to delete the API key for ${
          providers.find((p) => p.id === providerId)?.name
        }?`
      )
    ) {
      return;
    }

    try {
      setDeleting(providerId);
      setError(null);
      const response = await sendMessage({
        action: "deleteProviderApiKey",
        providerId,
      });
      if (response.success) {
        const updatedKeys = { ...apiKeys };
        delete updatedKeys[providerId];
        setApiKeys(updatedKeys);
        // If we deleted the currently selected provider, switch to another one
        if (selectedProvider === providerId) {
          const remainingProviders = providers.filter((p) => updatedKeys[p.id]);
          if (remainingProviders.length > 0) {
            await handleProviderSelect(remainingProviders[0].id);
          }
        }
      } else {
        setError(response.error || "Failed to delete API key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-gray-800 flex items-center justify-center">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-white" />
          <h1 className="text-3xl text-white">Settings</h1>
        </div>
        <button onClick={onClose} className="text-white">
          <X className="w-5 h-5 hover:text-white/80 transition-colors" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 min-h-0 relative z-10">
        <ErrorMessage message={error || ""} />

        {/* Current Provider */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-white" />
            <p className="text-lg text-white">Current Provider</p>
          </div>
          <div className="space-y-3">
            {providers.map((provider) => (
              <ProviderRadio
                key={provider.id}
                id={provider.id}
                name={provider.name}
                icon={provider.icon}
                isSelected={selectedProvider === provider.id}
                hasKey={!!apiKeys[provider.id]}
                onSelect={() => handleProviderSelect(provider.id)}
              />
            ))}
          </div>
        </div>

        {/* API Key Inputs */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-white" />
            <p className="text-lg text-white">Your API Keys</p>
          </div>
          <p className="text-sm text-white/50 mb-4">
            API keys are stored securely in your browser and never displayed. To
            change a key, delete it and add a new one.
          </p>
          <div className="space-y-4">
            {providers.map((provider) => (
              <ApiKeyInput
                key={provider.id}
                providerName={provider.name}
                providerIcon={provider.icon}
                hasKey={!!apiKeys[provider.id]}
                value={newApiKeys[provider.id] || ""}
                onChange={(value) =>
                  setNewApiKeys((prev) => ({ ...prev, [provider.id]: value }))
                }
                onSave={() => handleSaveApiKey(provider.id)}
                onDelete={() => handleDeleteApiKey(provider.id)}
                isSaving={saving === provider.id}
                isDeleting={deleting === provider.id}
              />
            ))}
          </div>
        </div>

        {/* Data Storage Notice */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/90 font-medium mb-1">
                Data Storage
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                All data (prompts, labels, and API keys) are stored locally in
                your browser. If you delete the extension, all of your data will
                be permanently lost.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-white/50 text-center">
          No API keys?{" "}
          <a
            href="https://platform.openai.com/account/api-keys"
            target="_blank"
            className="text-white"
          >
            Get an API key
          </a>
        </p>
      </div>
    </div>
  );
};

export default Settings;
