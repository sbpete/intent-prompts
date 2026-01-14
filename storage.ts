/**
 * Data Model & Storage Module for Chrome Extension
 *
 * This module provides CRUD operations for prompts and labels using chrome.storage.local.
 * All operations are asynchronous and handle edge cases like first-time initialization,
 * label renaming, and maintaining data consistency between prompts and labels.
 */

import type { ProviderId } from "./providers";

// ============================================================================
// Chrome API Type Declarations
// ============================================================================

/**
 * Minimal type declarations for Chrome Extension Storage API.
 * In a full Chrome extension project, these would typically come from @types/chrome.
 */
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(
        keys?: string | string[] | { [key: string]: any } | null,
        callback?: (items: { [key: string]: any }) => void
      ): void;
      set(items: { [key: string]: any }, callback?: () => void): void;
    }
    const local: StorageArea;
  }
  namespace runtime {
    const lastError: { message: string } | undefined;
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a saved prompt with a unique name, content, and associated labels.
 */
export interface Prompt {
  name: string;
  content: string;
  labels: string[];
  originalContent?: string; // The original content before refinement (if the prompt has been refined)
}

/**
 * Represents a label with a unique name and optional context text.
 */
export interface Label {
  name: string;
  context: string;
  icon?: string; // Icon name (e.g., "pencil", "plane", "plant")
  color?: string; // Tailwind color class (e.g., "blue", "red", "green")
}

/**
 * Storage structure for provider API keys
 */
export interface ProviderApiKeys {
  [providerId: string]: string; // providerId -> apiKey
}

/**
 * Internal storage structure for chrome.storage.local
 */
interface StorageData {
  prompts: Prompt[];
  labels: Label[];
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  PROMPTS: "prompts",
  LABELS: "labels",
  PROVIDER_API_KEYS: "provider_api_keys",
  SELECTED_PROVIDER: "selected_provider",
} as const;

// ============================================================================
// Storage Wrapper (for testability)
// ============================================================================

/**
 * Wrapper around chrome.storage.local to enable mocking in tests.
 * In production, this directly uses chrome.storage.local.
 */
const storage = {
  /**
   * Get data from chrome.storage.local
   */
  async get(
    keys?: string | string[] | { [key: string]: any } | null
  ): Promise<{ [key: string]: any }> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Storage get error: ${chrome.runtime.lastError.message}`
              )
            );
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(
          new Error(
            `Storage get failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  },

  /**
   * Set data in chrome.storage.local
   */
  async set(items: { [key: string]: any }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Storage set error: ${chrome.runtime.lastError.message}`
              )
            );
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(
          new Error(
            `Storage set failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize storage with empty arrays if keys don't exist.
 * Returns the current storage data with defaults.
 */
async function getStorageData(): Promise<StorageData> {
  const data = await storage.get([STORAGE_KEYS.PROMPTS, STORAGE_KEYS.LABELS]);

  return {
    prompts: Array.isArray(data[STORAGE_KEYS.PROMPTS])
      ? data[STORAGE_KEYS.PROMPTS]
      : [],
    labels: Array.isArray(data[STORAGE_KEYS.LABELS])
      ? data[STORAGE_KEYS.LABELS]
      : [],
  };
}

/**
 * Save storage data back to chrome.storage.local
 */
async function saveStorageData(data: StorageData): Promise<void> {
  await storage.set({
    [STORAGE_KEYS.PROMPTS]: data.prompts,
    [STORAGE_KEYS.LABELS]: data.labels,
  });
}

// ============================================================================
// Prompt Operations
// ============================================================================

/**
 * Retrieve all saved prompts.
 * @returns Promise resolving to an array of all prompts (empty array if none exist)
 */
export async function getAllPrompts(): Promise<Prompt[]> {
  try {
    const data = await getStorageData();
    return data.prompts;
  } catch (error) {
    throw new Error(
      `Failed to get all prompts: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Retrieve a single prompt by its name (case-sensitive).
 * @param name - The unique name of the prompt to retrieve
 * @returns Promise resolving to the prompt if found, or null if not found
 */
export async function getPrompt(name: string): Promise<Prompt | null> {
  try {
    const prompts = await getAllPrompts();
    const prompt = prompts.find((p) => p.name === name);
    return prompt || null;
  } catch (error) {
    throw new Error(
      `Failed to get prompt "${name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create or update a prompt.
 *
 * Strategy: If a prompt with the same name exists, it will be overwritten.
 * This simplifies the API by treating save as an upsert operation.
 *
 * @param prompt - The prompt to save (name must be provided)
 * @returns Promise that resolves when the prompt is saved
 * @throws Error if prompt name is empty or storage operation fails
 */
export async function savePrompt(prompt: Prompt): Promise<void> {
  if (!prompt.name || prompt.name.trim() === "") {
    throw new Error("Prompt name cannot be empty");
  }

  try {
    const data = await getStorageData();

    // Find existing prompt with the same name
    const existingIndex = data.prompts.findIndex((p) => p.name === prompt.name);

    if (existingIndex >= 0) {
      // Update existing prompt
      data.prompts[existingIndex] = { ...prompt };
    } else {
      // Add new prompt
      data.prompts.push({ ...prompt });
    }

    await saveStorageData(data);
  } catch (error) {
    throw new Error(
      `Failed to save prompt "${prompt.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete a prompt by name.
 * If the prompt doesn't exist, this still resolves successfully (no error).
 *
 * @param name - The name of the prompt to delete
 * @returns Promise that resolves when the deletion is complete
 */
export async function deletePrompt(name: string): Promise<void> {
  try {
    const data = await getStorageData();
    const initialLength = data.prompts.length;
    data.prompts = data.prompts.filter((p) => p.name !== name);

    // Only save if something was actually removed (optimization)
    if (data.prompts.length < initialLength) {
      await saveStorageData(data);
    }
  } catch (error) {
    throw new Error(
      `Failed to delete prompt "${name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ============================================================================
// Label Operations
// ============================================================================

/**
 * Retrieve all saved labels.
 * @returns Promise resolving to an array of all labels (empty array if none exist)
 */
export async function getAllLabels(): Promise<Label[]> {
  try {
    const data = await getStorageData();
    return data.labels;
  } catch (error) {
    throw new Error(
      `Failed to get all labels: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create or update a label.
 *
 * If oldName is provided and differs from label.name, this represents a rename operation.
 * In this case:
 * - The label's name is updated
 * - All prompts that reference oldName in their labels array are updated to use label.name
 * - If a label with the new name already exists (and it's not the same label being renamed),
 *   an error is thrown to prevent duplicate names
 *
 * If oldName is not provided or equals label.name:
 * - If a label with that name exists, update its context
 * - If it doesn't exist, create a new label
 *
 * @param label - The label to save (name must be provided)
 * @param oldName - Optional: the previous name if renaming a label
 * @returns Promise that resolves when the label is saved
 * @throws Error if label name is empty, if renaming would create a duplicate, or if storage fails
 */
export async function saveLabel(label: Label, oldName?: string): Promise<void> {
  if (!label.name || label.name.trim() === "") {
    throw new Error("Label name cannot be empty");
  }

  try {
    const data = await getStorageData();
    const isRename = oldName !== undefined && oldName !== label.name;

    if (isRename) {
      // Rename operation
      const oldLabelIndex = data.labels.findIndex((l) => l.name === oldName);

      if (oldLabelIndex < 0) {
        throw new Error(`Cannot rename label "${oldName}": label not found`);
      }

      // Check if new name conflicts with an existing label (that's not the one being renamed)
      const conflictingLabel = data.labels.find(
        (l) => l.name === label.name && l.name !== oldName
      );
      if (conflictingLabel) {
        throw new Error(
          `Cannot rename label "${oldName}" to "${label.name}": a label with that name already exists`
        );
      }

      // Update the label
      data.labels[oldLabelIndex] = { ...label };

      // Update all prompts that reference the old label name
      data.prompts = data.prompts.map((prompt) => ({
        ...prompt,
        labels: prompt.labels.map((labelName) =>
          labelName === oldName ? label.name : labelName
        ),
      }));
    } else {
      // Create or update operation (no rename)
      const existingIndex = data.labels.findIndex((l) => l.name === label.name);

      if (existingIndex >= 0) {
        // Update existing label's context
        data.labels[existingIndex] = { ...label };
      } else {
        // Check for duplicate (shouldn't happen, but defensive check)
        const duplicate = data.labels.find((l) => l.name === label.name);
        if (duplicate) {
          throw new Error(`Label with name "${label.name}" already exists`);
        }
        // Add new label
        data.labels.push({ ...label });
      }
    }

    await saveStorageData(data);
  } catch (error) {
    if (
      (error instanceof Error && error.message.startsWith("Cannot rename")) ||
      error.message.startsWith("Label with name")
    ) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error(
      `Failed to save label "${label.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete a label by name.
 * After deletion, removes the label name from all prompts' labels arrays to maintain consistency.
 *
 * @param name - The name of the label to delete
 * @returns Promise that resolves when the deletion is complete
 */
export async function deleteLabel(name: string): Promise<void> {
  try {
    const data = await getStorageData();
    const initialLabelLength = data.labels.length;

    // Remove the label
    data.labels = data.labels.filter((l) => l.name !== name);

    // Remove the label from all prompts' labels arrays
    let promptsChanged = false;
    data.prompts = data.prompts.map((prompt) => {
      const hasLabel = prompt.labels.includes(name);
      if (hasLabel) {
        promptsChanged = true;
        return {
          ...prompt,
          labels: prompt.labels.filter((labelName) => labelName !== name),
        };
      }
      return prompt;
    });

    // Only save if something was actually changed
    if (data.labels.length < initialLabelLength || promptsChanged) {
      await saveStorageData(data);
    }
  } catch (error) {
    throw new Error(
      `Failed to delete label "${name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
