import { useState, useEffect, useRef } from "react";
import { Prompt, Label } from "./storage";
import { ClarificationChat } from "./ClarificationChat";
import {
  Sparkles,
  Check,
  Pencil,
  Plane,
  Sprout,
  Star,
  Heart,
  Folder,
  File,
  Tag,
  Lightbulb,
  Code,
  Book,
  Music,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { Toast } from "./components/Toast";

/**
 * Props for the PromptEditor component.
 * Handles editing or creating a prompt with name, content, labels, and AI refinement.
 */
export interface PromptEditorProps {
  prompt: Prompt; // the prompt being edited (could be empty for new)
  labels: Label[]; // list of all available labels to choose from
  onSave: (updatedPrompt: Prompt) => void | Promise<void>;
  onCancel: () => void;
  onRefine: (currentPrompt: Prompt) => Promise<string>;
  onDelete?: (prompt: Prompt) => void; // optional, if we allow deletion here
  sendMessage: (message: any) => Promise<any>; // function to send messages to background
}

// Icon mapping for labels
const LABEL_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "pencil", icon: Pencil },
  { name: "plane", icon: Plane },
  { name: "plant", icon: Sprout },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "folder", icon: Folder },
  { name: "file", icon: File },
  { name: "tag", icon: Tag },
  { name: "lightbulb", icon: Lightbulb },
  { name: "code", icon: Code },
  { name: "book", icon: Book },
  { name: "music", icon: Music },
];

// Helper to get color classes
const getColorClasses = (
  color: string | undefined,
  variant: "bg" | "border" | "text" = "bg"
) => {
  const colorMap: Record<string, string> = {
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
    gray:
      variant === "bg"
        ? "bg-gray-400"
        : variant === "border"
        ? "border-gray-400"
        : "text-gray-300",
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
  return colorMap[color || "blue"] || colorMap.blue;
};

/**
 * Prompt Editor & Refinement UI Module for Chrome Extension
 *
 * This component provides a form for editing or creating a prompt.
 * It allows the user to modify the prompt's name and content, assign labels,
 * and use an AI "Fast Improve" feature to refine the content.
 * The component is self-contained, managing its own form state and only
 * calling out via provided callbacks for save, cancel, and refine actions.
 */
export const PromptEditor = ({
  prompt,
  labels,
  onSave,
  onCancel,
  sendMessage,
}: PromptEditorProps) => {
  const [name, setName] = useState(prompt.name || "");
  const [content, setContent] = useState(prompt.content || "");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : null
  );
  const [showClarification, setShowClarification] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isPreviousPromptExpanded, setIsPreviousPromptExpanded] = useState(false);
  const [originalContentBeforeRefinement, setOriginalContentBeforeRefinement] = useState<string | undefined>(
    prompt.originalContent
  );

  // Track original values to detect unsaved changes
  const originalPromptRef = useRef<Prompt>(prompt);
  
  // Determine if previous prompt should be shown and if it's long
  // Show originalContent if it exists (prompt has been refined), otherwise don't show
  const previousPromptText = originalContentBeforeRefinement || "";
  const isEditingExistingPrompt = prompt.name && prompt.name.trim().length > 0;
  const hasPreviousPrompt = isEditingExistingPrompt && previousPromptText.trim().length > 0;
  const isLongPreviousPrompt = previousPromptText.length > 200 || previousPromptText.split('\n').length > 3;

  // Update state when prompt prop changes
  useEffect(() => {
    setName(prompt.name || "");
    setContent(prompt.content || "");
    setSelectedLabel(
      prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : null
    );
    setOriginalContentBeforeRefinement(prompt.originalContent);
    originalPromptRef.current = prompt;
  }, [prompt.name, prompt.content, prompt.labels, prompt.originalContent]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    const currentName = name.trim();
    const currentContent = content.trim();
    const currentLabels = selectedLabel ? [selectedLabel] : [];

    const originalName = originalPromptRef.current.name || "";
    const originalContent = originalPromptRef.current.content || "";
    const originalLabels = originalPromptRef.current.labels || [];

    return (
      currentName !== originalName ||
      currentContent !== originalContent ||
      JSON.stringify(currentLabels.sort()) !==
        JSON.stringify(originalLabels.sort())
    );
  };

  // Handle cancel with unsaved changes check
  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      );
      if (confirmed) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const handleRefine = () => {
    setShowClarification(true);
  };

  // If showing clarification, render ClarificationChat in place of editor
  if (showClarification) {
    return (
      <ClarificationChat
        prompt={{
          name: name || "",
          content: content,
          labels: selectedLabel ? [selectedLabel] : [],
        }}
        labels={labels}
        sendMessage={sendMessage}
        onComplete={(refined) => {
          const wasRefined = refined.trim() !== content.trim();
          // If this is the first refinement, save current content as original
          if (wasRefined && !originalContentBeforeRefinement) {
            setOriginalContentBeforeRefinement(content);
          }
          setContent(refined);
          setShowClarification(false);
          if (wasRefined) {
            setToastMessage("Prompt refined successfully");
            setShowToast(true);
          }
        }}
        onCancel={() => {
          // Just return to editor, no confirmation needed
          setShowClarification(false);
        }}
      />
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}

      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-3xl text-white">
            {prompt.name ? "Edit Prompt" : "New Prompt"}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 min-h-0">
          {/* Previous Prompt Display - Show when editing existing prompt */}
          {hasPreviousPrompt && (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              {isLongPreviousPrompt ? (
                <>
                  <button
                    onClick={() => setIsPreviousPromptExpanded(!isPreviousPromptExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <p className="text-xs font-medium text-white/50 uppercase">
                      Previous Version
                    </p>
                    {isPreviousPromptExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    )}
                  </button>
                  {isPreviousPromptExpanded && (
                    <div className="px-4 pb-4 max-h-64 overflow-y-auto custom-scrollbar">
                      <p className="text-sm font-light text-white whitespace-pre-wrap">
                        {previousPromptText}
                      </p>
                    </div>
                  )}
                  {!isPreviousPromptExpanded && (
                    <div className="px-4 pb-3">
                      <p 
                        className="text-sm font-light text-white/70 whitespace-pre-wrap"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {previousPromptText}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-white/50 uppercase mb-2">
                    Previous Version
                  </p>
                  <p className="text-sm font-light text-white whitespace-pre-wrap">
                    {previousPromptText}
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-white/50 font-light"
              placeholder="Enter prompt name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-white/50 font-light resize-y"
              placeholder="Enter prompt content"
              rows={12}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Label
            </label>
            <p className="text-sm text-white/50 mb-3">
              Select one label to categorize this prompt.
            </p>
            {labels.length === 0 ? (
              <p className="text-sm text-white/50">
                No labels available. Create labels in the Labels tab.
              </p>
            ) : (
              <div className="space-y-3">
                {labels.map((label) => {
                  const isSelected = selectedLabel === label.name;
                  return (
                    <label
                      key={label.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedLabel(null);
                        } else {
                          setSelectedLabel(label.name);
                        }
                      }}
                      // We apply the specific color classes dynamically here
                      className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all backdrop-blur-sm ${
                        isSelected
                          ? `${getColorClasses(
                              label.color || "blue",
                              "border"
                            )} ${getColorClasses(
                              label.color || "blue",
                              "bg"
                            )} bg-opacity-10 shadow-lg` // Dynamic Border & Low Opacity Background
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                      // Inline style for shadow color to match the label color if needed,
                      // or rely on the class above if your utility supports it.
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio Circle */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? `${getColorClasses(
                                  label.color || "blue",
                                  "border"
                                )} ${getColorClasses(
                                  label.color || "blue",
                                  "bg"
                                )}`
                              : "border-white/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>

                        {/* Icon & Label Text */}
                        {(() => {
                          const iconInfo = LABEL_ICONS.find(
                            (i) => i.name === (label.icon || "pencil")
                          );
                          const IconComponent = iconInfo?.icon || Pencil;
                          const labelColor = label.color || "blue";

                          return (
                            <>
                              <div
                                className={`p-2 rounded-lg ${getColorClasses(
                                  labelColor,
                                  "bg"
                                )} bg-opacity-20`}
                              >
                                <IconComponent
                                  className={`w-4 h-4 ${getColorClasses(
                                    labelColor,
                                    "text"
                                  )}`}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-white font-medium text-base">
                                  {label.name}
                                </span>
                                {label.context && (
                                  <p className="text-sm text-white/50 mt-1">
                                    {label.context}
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Checkmark Icon */}
                      {isSelected && (
                        <Check
                          className={`w-5 h-5 ${getColorClasses(
                            label.color || "blue",
                            "text"
                          )}`}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex-shrink-0">
          <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
            <div className="flex gap-2 flex-wrap w-full xs:w-auto">
              <button
                onClick={async () => {
                  const savedPrompt = {
                    name,
                    content,
                    labels: selectedLabel ? [selectedLabel] : [],
                    ...(originalContentBeforeRefinement && { originalContent: originalContentBeforeRefinement }),
                  };
                  await onSave(savedPrompt);
                  // Update original reference after saving
                  originalPromptRef.current = savedPrompt;
                }}
                className="w-full xs:w-auto px-6 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-white/90 transition-colors font-medium text-sm text-center"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="w-full xs:w-auto px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium text-sm text-center"
              >
                Cancel
              </button>
            </div>

            <button
              onClick={handleRefine}
              disabled={!content.trim()}
              className="w-full xs:w-auto px-5 py-2.5 text-white rounded-xl hover:bg-white/20 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400"
            >
              <Sparkles className="w-4 h-4" />
              <span>Refine Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
