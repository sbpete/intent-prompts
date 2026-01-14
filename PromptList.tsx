import { useState } from "react";
import { Prompt, Label } from "./storage";
import { Search, Plus, Edit, Trash2, Pencil, Plane, Sprout, Star, Heart, Folder, File, Tag, Lightbulb, Code, Book, Music, type LucideIcon } from "lucide-react";

/**
 * Props for the PromptList component.
 * Handles display, search, filtering, and actions on prompts.
 */
export interface PromptListProps {
  prompts: Prompt[];
  labels: Label[]; // All labels available (for filtering)
  onSelectPrompt: (name: string) => void;
  onCreatePrompt: () => void;
  onDeletePrompt: (name: string) => void;
  // Optional props (kept for backwards compatibility but not used):
  onRefinePrompt?: (name: string) => void;
  refiningPrompt?: string | null;
  // Optional props for search state management:
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  filterLabel?: string; // current label filter (label name or "All")
  onFilterLabelChange?: (label: string) => void;
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
const getColorClasses = (color: string | undefined, variant: "bg" | "border" | "text" = "bg") => {
  const colorMap: Record<string, string> = {
    white: variant === "bg" ? "bg-white" : variant === "border" ? "border-white" : "text-white",
    red: variant === "bg" ? "bg-red-400" : variant === "border" ? "border-red-400" : "text-red-300",
    orange: variant === "bg" ? "bg-orange-400" : variant === "border" ? "border-orange-400" : "text-orange-300",
    yellow: variant === "bg" ? "bg-yellow-400" : variant === "border" ? "border-yellow-400" : "text-yellow-300",
    lime: variant === "bg" ? "bg-lime-400" : variant === "border" ? "border-lime-400" : "text-lime-300",
    green: variant === "bg" ? "bg-green-400" : variant === "border" ? "border-green-400" : "text-green-300",
    blue: variant === "bg" ? "bg-blue-400" : variant === "border" ? "border-blue-400" : "text-blue-300",
    indigo: variant === "bg" ? "bg-indigo-400" : variant === "border" ? "border-indigo-400" : "text-indigo-300",
    purple: variant === "bg" ? "bg-purple-400" : variant === "border" ? "border-purple-400" : "text-purple-300",
    pink: variant === "bg" ? "bg-pink-400" : variant === "border" ? "border-pink-400" : "text-pink-300",
    gray: variant === "bg" ? "bg-gray-400" : variant === "border" ? "border-gray-400" : "text-gray-300",
    teal: variant === "bg" ? "bg-teal-400" : variant === "border" ? "border-teal-400" : "text-teal-300",
    cyan: variant === "bg" ? "bg-cyan-400" : variant === "border" ? "border-cyan-400" : "text-cyan-300",
    emerald: variant === "bg" ? "bg-emerald-400" : variant === "border" ? "border-emerald-400" : "text-emerald-300",
  };
  return colorMap[color || "blue"] || colorMap.blue;
};

/**
 * Individual prompt card component that adjusts button position based on viewport width
 * Buttons appear above name on narrow screens to prevent overlap
 */
const PromptCard = ({
  prompt,
  labels,
  onSelectPrompt,
  onDeletePrompt,
}: {
  prompt: Prompt;
  labels: Label[];
  onSelectPrompt: (name: string) => void;
  onDeletePrompt: (name: string) => void;
}) => {
  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 hover:border-white/20 transition-all group relative">
      {/* Buttons above name on narrow screens (default, xs) - shown above to prevent overlap */}
      <div className="flex gap-2 mb-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity xs:hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectPrompt(prompt.name);
          }}
          className="flex-shrink-0 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          title="Edit prompt"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
              onDeletePrompt(prompt.name);
            }
          }}
          className="flex-shrink-0 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          title="Delete prompt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Buttons in top-right on wider screens (sm and up) */}
      <div className="hidden xs:flex absolute top-5 right-5 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectPrompt(prompt.name);
          }}
          className="flex-shrink-0 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          title="Edit prompt"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
              onDeletePrompt(prompt.name);
            }
          }}
          className="flex-shrink-0 p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          title="Delete prompt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => onSelectPrompt(prompt.name)}
        className="w-full text-left pr-0 xs:pr-16"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="flex-1 text-xl text-white min-w-0 truncate">
            {prompt.name}
          </h3>
        </div>

        <p className="text-sm font-light text-white/70 line-clamp-2">
          {prompt.content}
        </p>

        {prompt.labels && prompt.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {prompt.labels.map((labelName) => {
              const label = labels.find((l) => l.name === labelName);
              const iconInfo = LABEL_ICONS.find((i) => i.name === (label?.icon || "pencil"));
              const IconComponent = iconInfo?.icon || Pencil;
              const labelColor = label?.color || "blue";
              
              return (
                <span
                  key={labelName}
                  className={`text-xs px-3 py-1 ${getColorClasses(labelColor, "bg")} bg-opacity-20 ${getColorClasses(labelColor, "border")} border border-opacity-30 text-white/90 rounded-full font-light flex items-center gap-1.5`}
                >
                  <IconComponent className={`w-3 h-3 ${getColorClasses(labelColor, "text")}`} />
                  {labelName}
                </span>
              );
            })}
          </div>
        )}
      </button>
    </div>
  );
};

/**
 * Prompt List & Search UI Module for Chrome Extension Side Panel
 *
 * This component displays a list of prompts with search and filter capabilities.
 * It supports both controlled and uncontrolled modes for search/filter state.
 * All data operations are handled by parent components via callbacks.
 */
export const PromptList = ({
  prompts,
  labels,
  onCreatePrompt,
  onSelectPrompt,
  onDeletePrompt,
}: PromptListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Pencil className="w-5 h-5 text-white" />
          <h1 className="text-3xl text-white">Prompts</h1>
        </div>
        <div className="space-y-4">
          <button
            onClick={onCreatePrompt}
            className="w-full py-3 bg-white text-gray-900 rounded-lg hover:bg-white/90 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Prompt</span>
          </button>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-white/50 font-light text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 min-h-0">
        {filteredPrompts.length === 0 ? (
          <div className="text-white/50 text-center py-8">
            {searchQuery
              ? "No prompts found matching your search."
              : "No prompts found. Create your first prompt!"}
          </div>
        ) : (
          filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.name}
              prompt={prompt}
              labels={labels}
              onSelectPrompt={onSelectPrompt}
              onDeletePrompt={onDeletePrompt}
            />
          ))
        )}
      </div>
    </div>
  );
};
