/**
 * Side Panel UI Shell Module for Chrome Extension
 *
 * This is the main React component that runs in the extension's side panel.
 * It manages global state (prompts and labels data) and provides a tabbed interface
 * for switching between prompt management and label management views.
 *
 * This component coordinates the UI and handles communication with the background script.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Prompt, Label } from "./storage";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { Settings } from "./Settings";
import { IntroFlow } from "./IntroFlow";

// ============================================================================
// Chrome API Type Declarations
// ============================================================================

declare namespace chrome {
  namespace runtime {
    interface Port {
      name: string;
      postMessage(message: any): void;
      disconnect(): void;
      onMessage: {
        addListener(callback: (message: any) => void): void;
      };
      onDisconnect: {
        addListener(callback: () => void): void;
      };
    }

    function sendMessage(
      message: any,
      responseCallback?: (response: any) => void
    ): void;
    function connect(connectInfo?: { name?: string }): Port;
    const lastError: { message: string } | undefined;
  }
}

// ============================================================================
// Child Component Prop Interfaces
// ============================================================================

/**
 * Props for the LabelManager component
 */
interface LabelManagerProps {
  labels: Label[];
  onSaveLabel: (label: Label, oldName?: string) => Promise<void>;
  onDeleteLabel: (name: string) => Promise<void>;
}

// ============================================================================
// Background Message Response Type
// ============================================================================

interface BackgroundResponse {
  success: boolean;
  error?: string;
  prompts?: Prompt[];
  labels?: Label[];
  refinedText?: string;
  needsClarification?: boolean;
  question?: string;
  isComplete?: boolean;
  providerApiKeys?: { [key: string]: string };
  selectedProvider?: string;
}

// ============================================================================
// Helper Functions for Background Communication
// ============================================================================

/**
 * Persistent connection to the service worker
 * This keeps the service worker alive while the side panel is open
 */
let backgroundPort: chrome.runtime.Port | null = null;
let messageIdCounter = 0;
const pendingMessages = new Map<
  number,
  {
    resolve: (value: BackgroundResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

/**
 * Initialize a persistent connection to the service worker
 * This keeps the service worker alive while the side panel is open
 */
function initializeConnection(): void {
  if (backgroundPort) {
    return; // Already connected
  }

  try {
    backgroundPort = chrome.runtime.connect({ name: "sidepanel" });

    backgroundPort.onMessage.addListener((response: any) => {
      const { messageId, ...data } = response;
      const pending = pendingMessages.get(messageId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingMessages.delete(messageId);
        pending.resolve(data);
      }
    });

    backgroundPort.onDisconnect.addListener(() => {
      // Connection closed, clear it and reject all pending messages
      backgroundPort = null;
      for (const [, pending] of pendingMessages.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Service worker connection closed"));
      }
      pendingMessages.clear();

      // Try to reconnect after a short delay
      setTimeout(() => {
        if (!backgroundPort) {
          initializeConnection();
        }
      }, 100);
    });

    console.log("Background connection established");
  } catch (error) {
    console.error("Failed to establish background connection:", error);
  }
}

/**
 * Send a message to the background script using persistent connection
 * Falls back to sendMessage if connection fails
 */
async function sendMessageToBackground(
  message: any
): Promise<BackgroundResponse> {
  // Ensure connection is established
  if (!backgroundPort) {
    initializeConnection();
    // Give it a moment to connect
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // If still no connection, fall back to sendMessage
  if (!backgroundPort) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: BackgroundResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error("No response from background script"));
          return;
        }
        resolve(response);
      });
    });
  }

  // Use persistent connection
  const messageId = ++messageIdCounter;
  
  // LLM operations can take longer, use extended timeout
  const llmActions = [
    "generateClarifyingQuestions",
    "generateFinalRefinedPrompt",
    "refinePrompt",
  ];
  const isLLMOperation = message.action && llmActions.includes(message.action);
  const timeoutDuration = isLLMOperation ? 60000 : 10000; // 60s for LLM, 10s for others
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingMessages.delete(messageId);
      reject(new Error("Message timeout"));
    }, timeoutDuration);

    pendingMessages.set(messageId, { resolve, reject, timeout });

    try {
      backgroundPort!.postMessage({ messageId, ...message });
    } catch (error) {
      pendingMessages.delete(messageId);
      clearTimeout(timeout);
      reject(
        new Error(
          `Failed to send message: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  });
}

import { ClarificationNeededError } from "./errors";
import {
  SettingsIcon,
  Tag,
  Edit,
  Trash2,
  Pencil,
  Plane,
  Sprout,
  Star,
  Heart,
  Folder,
  File,
  Code,
  Book,
  Music,
  type LucideIcon,
  Database,
  Globe,
} from "lucide-react";

// ============================================================================
// Label Icon and Color Constants
// ============================================================================

// Available icons (12 total)
const LABEL_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "pencil", icon: Pencil },
  { name: "plane", icon: Plane },
  { name: "plant", icon: Sprout },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "folder", icon: Folder },
  { name: "file", icon: File },
  { name: "globe", icon: Globe },
  { name: "database", icon: Database },
  { name: "code", icon: Code },
  { name: "book", icon: Book },
  { name: "music", icon: Music },
];

// Available colors (basic Tailwind colors)
const LABEL_COLORS = [
  "white",
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;

type LabelColor = (typeof LABEL_COLORS)[number];

// Helper function to get color classes
const getColorClasses = (
  color: LabelColor,
  variant: "bg" | "border" | "text" = "bg"
) => {
  const colorMap: Record<LabelColor, string> = {
    white:
      variant === "bg"
        ? "bg-white"
        : variant === "border"
        ? "border-white"
        : "text-white",
    red:
      variant === "bg"
        ? "bg-red-400"
        : variant === "border"
        ? "border-red-400"
        : "text-red-300",
    orange:
      variant === "bg"
        ? "bg-orange-400"
        : variant === "border"
        ? "border-orange-400"
        : "text-orange-300",
    yellow:
      variant === "bg"
        ? "bg-yellow-400"
        : variant === "border"
        ? "border-yellow-400"
        : "text-yellow-300",
    lime:
      variant === "bg"
        ? "bg-lime-400"
        : variant === "border"
        ? "border-lime-400"
        : "text-lime-300",
    green:
      variant === "bg"
        ? "bg-green-400"
        : variant === "border"
        ? "border-green-400"
        : "text-green-300",
    blue:
      variant === "bg"
        ? "bg-blue-400"
        : variant === "border"
        ? "border-blue-400"
        : "text-blue-300",
    indigo:
      variant === "bg"
        ? "bg-indigo-400"
        : variant === "border"
        ? "border-indigo-400"
        : "text-indigo-300",
    purple:
      variant === "bg"
        ? "bg-purple-400"
        : variant === "border"
        ? "border-purple-400"
        : "text-purple-300",
    pink:
      variant === "bg"
        ? "bg-pink-400"
        : variant === "border"
        ? "border-pink-400"
        : "text-pink-300",
    teal:
      variant === "bg"
        ? "bg-teal-400"
        : variant === "border"
        ? "border-teal-400"
        : "text-teal-300",
    cyan:
      variant === "bg"
        ? "bg-cyan-400"
        : variant === "border"
        ? "border-cyan-400"
        : "text-cyan-300",
    emerald:
      variant === "bg"
        ? "bg-emerald-400"
        : variant === "border"
        ? "border-emerald-400"
        : "text-emerald-300",
  };
  return colorMap[color] || colorMap.white;
};
// Placeholder Child Components (to be replaced with actual implementations)
// ============================================================================

// Helper to handle clicks outside the dropdown
function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

const LabelManager: React.FC<LabelManagerProps> = ({
  labels,
  onSaveLabel,
  onDeleteLabel,
}) => {
  const defaultIcon = "folder";
  const defaultColor = "white";
  const defaultIconComponent = Folder;

  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelContext, setNewLabelContext] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>(defaultIcon);
  const [selectedColor, setSelectedColor] = useState<LabelColor>(defaultColor);

  // State for the picker dropdown
  const [showIconPicker, setShowIconPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(pickerRef, () => setShowIconPicker(false));

  const handleCreate = () => {
    setEditingLabel({
      name: "",
      context: "",
      icon: defaultIcon,
      color: defaultColor,
    });
    setNewLabelName("");
    setNewLabelContext("");
    setSelectedIcon(defaultIcon);
    setSelectedColor(defaultColor);
    setShowIconPicker(false);
  };

  const handleSave = async () => {
    if (!newLabelName.trim()) return;

    const oldName =
      editingLabel?.name && editingLabel.name !== newLabelName
        ? editingLabel.name
        : undefined;

    await onSaveLabel(
      {
        name: newLabelName.trim(),
        context: newLabelContext.trim(),
        icon: selectedIcon,
        color: selectedColor,
      },
      oldName
    );

    setEditingLabel(null);
    setNewLabelName("");
    setNewLabelContext("");
    setSelectedIcon(defaultIcon);
    setSelectedColor(defaultColor);
    setShowIconPicker(false);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelContext(label.context);
    setSelectedIcon(label.icon || defaultIcon);
    setSelectedColor((label.color as LabelColor) || defaultColor);
    setShowIconPicker(false);
  };

  // Helper to get the actual Icon component for the trigger button
  const CurrentIcon =
    LABEL_ICONS.find((i) => i.name === selectedIcon)?.icon ||
    defaultIconComponent;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-white" />
          <h1 className="text-3xl text-white">Labels</h1>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-white/90 transition-colors font-medium text-sm"
        >
          + New Label
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 min-h-0">
        {editingLabel !== null && (
          <div className="mb-4 p-4 border border-white/10 rounded-2xl bg-white/5 shadow-xl">
            <div className="space-y-4">
              {/* Top Row: Icon Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className={`w-12 h-12 mb-4 rounded-xl border flex items-center justify-center transition-all ${getColorClasses(
                    selectedColor,
                    "border"
                  )} ${getColorClasses(
                    selectedColor,
                    "bg"
                  )} bg-opacity-20 hover:bg-opacity-30`}
                >
                  <CurrentIcon
                    className={`w-6 h-6 ${getColorClasses(
                      selectedColor,
                      "text"
                    )}`}
                  />
                </button>

                {/* POPUP MENU */}
                {showIconPicker && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl z-50 w-[300px]">
                    {/* Color Section */}
                    <div className="grid grid-cols-7 gap-2 mb-4 p-1">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                            selectedColor === color
                              ? "ring-2 ring-white ring-offset-2 ring-offset-[#1C1C1E]"
                              : ""
                          }`}
                        >
                          <div
                            className={`w-full h-full rounded-full ${getColorClasses(
                              color,
                              "bg"
                            )}`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/10 w-full mb-4" />

                    {/* Icon Section */}
                    <div className="grid grid-cols-6 gap-2">
                      {LABEL_ICONS.map(({ name, icon: Icon }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setSelectedIcon(name)}
                          className={`p-2 rounded-lg transition-all flex items-center justify-center hover:bg-white/10 ${
                            selectedIcon === name
                              ? "text-white bg-white/10"
                              : "text-white/50"
                          }`}
                          title={name}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-2">
                    Label name
                  </label>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/50 font-light focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                    placeholder="Enter label name..."
                    autoFocus
                  />
                </div>
              </div>

              {/* Context Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Context / Description
                </label>
                <textarea
                  value={newLabelContext}
                  onChange={(e) => setNewLabelContext(e.target.value)}
                  className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/50 font-light resize-none focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                  placeholder="What is this label for?"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingLabel(null);
                    setNewLabelName("");
                    setNewLabelContext("");
                    setSelectedIcon(defaultIcon);
                    setSelectedColor(defaultColor);
                    setShowIconPicker(false);
                  }}
                  className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newLabelName.trim()}
                >
                  Save Label
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Label List (No changes needed here usually, but keeping context) */}
        {labels.filter(
          (label) => editingLabel === null || label.name !== editingLabel.name
        ).length === 0 && editingLabel === null ? (
          <div className="text-white/50 text-center py-8">
            No labels found. Create your first label!
          </div>
        ) : (
          <div className="space-y-3">
            {/* ... mapped labels ... */}
            {labels
              .filter(
                (label) =>
                  editingLabel === null || label.name !== editingLabel.name
              )
              .map((label) => {
                const iconInfo = LABEL_ICONS.find(
                  (i) => i.name === (label.icon || defaultIcon)
                );
                const IconComponent = iconInfo?.icon || defaultIconComponent;
                const labelColor = (label.color as LabelColor) || defaultColor;

                return (
                  <div
                    key={label.name}
                    onClick={() => handleEdit(label)}
                    className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 hover:border-white/20 transition-all group relative cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${getColorClasses(
                            labelColor,
                            "bg"
                          )} bg-opacity-20`}
                        >
                          <IconComponent
                            className={`w-5 h-5 ${getColorClasses(
                              labelColor,
                              "text"
                            )}`}
                          />
                        </div>
                        <h3 className="flex-1 text-xl text-white">
                          {label.name}
                        </h3>
                      </div>
                    </div>
                    {label.context && (
                      <p className="text-sm font-light text-white/70">
                        {label.context}
                      </p>
                    )}
                    <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(label);
                        }}
                        className="flex-shrink-0 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        title="Edit label"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Are you sure you want to delete "${label.name}"?`
                            )
                          ) {
                            onDeleteLabel(label.name);
                          }
                        }}
                        className="flex-shrink-0 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        title="Delete label"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main SidePanelShell Component
// ============================================================================

/**
 * Main Side Panel UI Shell Component
 *
 * This component manages the global state and coordinates the UI.
 * It handles communication with the background script and conditionally
 * renders child components based on the active tab and selected prompt.
 */
const SidePanelShell: React.FC = () => {
  // State management
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [activeTab, setActiveTab] = useState<"prompts" | "labels">("prompts");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [hasProvider, setHasProvider] = useState<boolean | null>(null); // null = checking, true = has provider, false = no provider

  // ============================================================================
  // Initial Data Load
  // ============================================================================

  useEffect(() => {
    // Initialize connection when component mounts
    initializeConnection();

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Wait a bit for connection to establish
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check provider selection first
        const settingsResponse = await sendMessageToBackground({
          action: "getSettings",
        });

        if (settingsResponse.success) {
          const hasSelectedProvider = !!settingsResponse.selectedProvider;
          const hasApiKeys =
            settingsResponse.providerApiKeys &&
            Object.keys(settingsResponse.providerApiKeys).length > 0;
          // Provider is considered configured if both selected and has at least one API key
          setHasProvider(!!(hasSelectedProvider && hasApiKeys));
        } else {
          setHasProvider(false);
        }

        // Load prompts and labels in parallel
        const [promptsResponse, labelsResponse] = await Promise.all([
          sendMessageToBackground({ action: "getPrompts" }),
          sendMessageToBackground({ action: "getLabels" }),
        ]);

        if (!promptsResponse.success) {
          throw new Error(promptsResponse.error || "Failed to load prompts");
        }

        if (!labelsResponse.success) {
          throw new Error(labelsResponse.error || "Failed to load labels");
        }

        setPrompts(promptsResponse.prompts || []);
        setLabels(labelsResponse.labels || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load initial data";
        setError(errorMessage);
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Re-check provider when settings are closed (in case they configured one)
  useEffect(() => {
    if (!showSettings) {
      const checkProvider = async () => {
        try {
          const settingsResponse = await sendMessageToBackground({
            action: "getSettings",
          });
          if (settingsResponse.success) {
            const hasSelectedProvider = !!settingsResponse.selectedProvider;
            const hasApiKeys =
              settingsResponse.providerApiKeys &&
              Object.keys(settingsResponse.providerApiKeys).length > 0;
            setHasProvider(!!(hasSelectedProvider && hasApiKeys));
          }
        } catch (err) {
          console.error("Error checking provider:", err);
        }
      };
      // Small delay to ensure settings have been saved
      const timeoutId = setTimeout(checkProvider, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [showSettings]);

  // ============================================================================
  // Handler Functions
  // ============================================================================

  /**
   * Handle selecting a prompt to edit
   */
  const handleSelectPrompt = useCallback(
    (name: string) => {
      const prompt = prompts.find((p) => p.name === name);
      if (prompt) {
        setSelectedPrompt(prompt);
        setError(null);
      }
    },
    [prompts]
  );

  /**
   * Handle creating a new prompt
   */
  const handleCreatePrompt = useCallback(() => {
    setSelectedPrompt({
      name: "",
      content: "",
      labels: [],
    });
    setError(null);
  }, []);

  /**
   * Handle saving a prompt (create or update)
   */
  const handleSavePrompt = useCallback(async (prompt: Prompt) => {
    // Validation
    if (!prompt.name || prompt.name.trim() === "") {
      setError("Prompt name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sendMessageToBackground({
        action: "savePrompt",
        prompt,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to save prompt");
      }

      // Update prompts state with the response
      if (response.prompts) {
        setPrompts(response.prompts);
      }

      // Clear selected prompt to return to list view
      setSelectedPrompt(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save prompt";
      setError(errorMessage);
      console.error("Error saving prompt:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle canceling prompt editing
   */
  const handleCancelEdit = useCallback(() => {
    setSelectedPrompt(null);
    setError(null);
  }, []);

  /**
   * Handle refining a prompt from within the editor
   * Returns the refined text as a Promise<string>
   * Throws a ClarificationNeededError if clarification is required
   */
  const handleRefineInEditor = useCallback(
    async (prompt: Prompt): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        // First, try to refine by name if it exists
        // If it's a new prompt (no name), we'd need to handle differently
        // For now, we'll require the prompt to be saved first, or we can
        // send the prompt object directly if background supports it
        if (!prompt.name || prompt.name.trim() === "") {
          // For new prompts, we might need to refine with just content
          // This is a limitation - we'd need background to support refining
          // a prompt object directly. For now, show an error.
          throw new Error(
            "Please save the prompt first before refining, or enter a name"
          );
        }

        const response = await sendMessageToBackground({
          action: "refinePrompt",
          name: prompt.name,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to refine prompt");
        }

        // Check if clarification is needed
        if (response.needsClarification && response.question) {
          throw new ClarificationNeededError(response.question);
        }

        if (!response.refinedText) {
          throw new Error("No refined text returned");
        }

        // Return the refined text - the editor will handle updating its state
        return response.refinedText;
      } catch (err) {
        // Don't set error for ClarificationNeededError - let the editor handle it
        if (err instanceof ClarificationNeededError) {
          throw err;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Failed to refine prompt";
        setError(errorMessage);
        console.error("Error refining prompt:", err);
        throw err; // Re-throw so editor can handle it
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Handle deleting a prompt
   */
  const handleDeletePrompt = useCallback(
    (name: string) => {
      setLoading(true);
      setError(null);

      // Perform deletion asynchronously
      sendMessageToBackground({
        action: "deletePrompt",
        name,
      })
        .then((response) => {
          if (!response.success) {
            throw new Error(response.error || "Failed to delete prompt");
          }

          // Update prompts state
          if (response.prompts) {
            setPrompts(response.prompts);
          }

          // If the deleted prompt was selected, clear selection
          if (selectedPrompt?.name === name) {
            setSelectedPrompt(null);
          }
        })
        .catch((err) => {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to delete prompt";
          setError(errorMessage);
          console.error("Error deleting prompt:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [selectedPrompt]
  );

  /**
   * Handle saving a label (create or update)
   */
  const handleSaveLabel = useCallback(
    async (label: Label, oldName?: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await sendMessageToBackground({
          action: "saveLabel",
          label,
          oldName,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to save label");
        }

        // Update labels state
        if (response.labels) {
          setLabels(response.labels);
        }

        // Update prompts if they were affected (e.g., label rename)
        if (response.prompts) {
          setPrompts(response.prompts);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save label";
        setError(errorMessage);
        console.error("Error saving label:", err);
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Handle deleting a label
   */
  const handleDeleteLabel = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessageToBackground({
        action: "deleteLabel",
        name,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to delete label");
      }

      // Update both labels and prompts (since label deletion affects prompts)
      if (response.labels) {
        setLabels(response.labels);
      }
      if (response.prompts) {
        setPrompts(response.prompts);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete label";
      setError(errorMessage);
      console.error("Error deleting label:", err);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Settings Page */}
      {showSettings ? (
        <Settings
          sendMessage={sendMessageToBackground}
          onClose={async () => {
            setShowSettings(false);
            // Immediately check provider status after closing settings
            try {
              const settingsResponse = await sendMessageToBackground({
                action: "getSettings",
              });
              if (settingsResponse.success) {
                const hasSelectedProvider = !!settingsResponse.selectedProvider;
                const hasApiKeys =
                  settingsResponse.providerApiKeys &&
                  Object.keys(settingsResponse.providerApiKeys).length > 0;
                setHasProvider(!!(hasSelectedProvider && hasApiKeys));
              }
            } catch (err) {
              console.error(
                "Error checking provider after settings close:",
                err
              );
            }
          }}
        />
      ) : (
        <div className="flex flex-col h-full w-full bg-gray-900 relative">
          {/* Tab Header */}
          {hasProvider && (
            <div className="flex border-b border-white/10 bg-gray-900">
              <button
                onClick={() => {
                  setActiveTab("prompts");
                  setSelectedPrompt(null);
                  setError(null);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "prompts"
                    ? "bg-gray-900 border-b-2 border-white text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                Prompts
              </button>
              <button
                onClick={() => {
                  setActiveTab("labels");
                  setSelectedPrompt(null);
                  setError(null);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "labels"
                    ? "bg-gray-900 border-b-2 border-white text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                Labels
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-900">
            {loading && hasProvider === null ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Loading...</div>
              </div>
            ) : hasProvider === false ? (
              <IntroFlow onOpenSettings={() => setShowSettings(true)} />
            ) : loading && !prompts.length && !labels.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Loading...</div>
              </div>
            ) : error && !prompts.length && !labels.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-400 p-4">
                  <p className="font-semibold">Error loading data</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => alert(error || "Unknown error")}
                    className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-medium text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ) : activeTab === "prompts" ? (
              selectedPrompt === null ? (
                <PromptList
                  prompts={prompts}
                  labels={labels}
                  onSelectPrompt={handleSelectPrompt}
                  onCreatePrompt={handleCreatePrompt}
                  onDeletePrompt={handleDeletePrompt}
                />
              ) : (
                <PromptEditor
                  prompt={selectedPrompt}
                  labels={labels}
                  onSave={handleSavePrompt}
                  onCancel={handleCancelEdit}
                  onRefine={handleRefineInEditor}
                  sendMessage={sendMessageToBackground}
                />
              )
            ) : (
              <LabelManager
                labels={labels}
                onSaveLabel={handleSaveLabel}
                onDeleteLabel={handleDeleteLabel}
              />
            )}
          </div>
        </div>
      )}
      {/* Settings Button - Bottom left when closed, Top right when open (only show if provider is configured and settings are closed) */}
      {hasProvider && !showSettings && !selectedPrompt && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className={`fixed p-3 bg-gray-200 hover:bg-gray-300 rounded-full shadow-lg transition-colors z-100 pointer-events-auto transform transition-transform duration-200 hover:scale-110 ${
            showSettings ? "top-4 right-4" : "bottom-4 right-4"
          }`}
          title={showSettings ? "Close Settings" : "Settings"}
          type="button"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      )}

      {/* Error Indicator - Top Right (only show if there's an error and provider is configured) */}
      {hasProvider && error && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert(error);
          }}
          className="fixed bottom-4 right-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors z-50 pointer-events-auto"
          title="View Error"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      )}
    </>
  );
};

export default SidePanelShell;
