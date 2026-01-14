/**
 * Background Orchestrator Module for Chrome Extension
 *
 * This is the Manifest V3 service worker that mediates between the side panel UI
 * and the internal logic for storing and refining prompts. It handles incoming
 * messages from the UI and routes them to the appropriate Storage or AI modules.
 *
 * Note: This script requires:
 * - "sidePanel" permission in manifest.json
 * - Host permissions for the AI API endpoint (if refinePrompt makes external calls)
 * - The service_worker field in manifest.json should point to this file (or a bundled version)
 */

// ============================================================================
// Chrome API Type Declarations
// ============================================================================

/**
 * Minimal type declarations for Chrome Extension Runtime API.
 * In a full Chrome extension project, these would typically come from @types/chrome.
 */
declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: any;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }

    type MessageResponseCallback = (response?: any) => void;

    interface MessageListener {
      (
        message: any,
        sender: MessageSender,
        sendResponse: MessageResponseCallback
      ): boolean | void | Promise<any>;
    }

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

    function connect(connectInfo?: { name?: string }): Port;

    const onMessage: {
      addListener(
        callback: MessageListener,
        options?: { includeTlsChannelId?: boolean }
      ): void;
      removeListener(callback: MessageListener): void;
      hasListener(callback: MessageListener): boolean;
    };

    const onConnect: {
      addListener(callback: (port: Port) => void): void;
    };

    const onInstalled: {
      addListener(callback: (details: any) => void): void;
    };

    const lastError: { message: string } | undefined;
  }

  namespace action {
    const onClicked: {
      addListener(callback: (tab: any) => void): void;
    };
  }

  namespace sidePanel {
    function open(options?: { windowId?: number }): Promise<void>;
  }

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

  namespace alarms {
    function create(
      name: string,
      alarmInfo: { delayInMinutes?: number; periodInMinutes?: number }
    ): void;
    const onAlarm: {
      addListener(callback: (alarm: { name: string }) => void): void;
    };
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

import type { Prompt, Label, ProviderApiKeys } from "./storage";
import {
  getAllPrompts,
  getPrompt,
  savePrompt,
  deletePrompt,
  getAllLabels,
  saveLabel,
  deleteLabel,
} from "./storage";
import {
  setProviderApiKey,
  deleteProviderApiKey,
  getAllProviderApiKeys,
  getSelectedProvider,
  setSelectedProvider,
} from "./providerStorage";
import type { ProviderId } from "./providers";

/**
 * AI Refinement Module
 *
 * Imports the refinePrompt function from the refinement module.
 * This module implements a system that analyzes prompt completeness
 * and determines importance from the prompt content itself (not the label).
 */
import {
  refinePrompt,
  generateClarifyingQuestions,
  generateFinalRefinedPrompt,
  type ConversationMessage,
} from "./refinePrompt";

/**
 * Message action types that the UI can send
 */
type MessageAction =
  | "ping"
  | "getPrompts"
  | "getLabels"
  | "savePrompt"
  | "deletePrompt"
  | "saveLabel"
  | "deleteLabel"
  | "refinePrompt"
  | "generateClarifyingQuestions"
  | "generateFinalRefinedPrompt"
  | "getSettings"
  | "setProviderApiKey"
  | "deleteProviderApiKey"
  | "setSelectedProvider";

/**
 * Base message structure from the UI
 */
interface BaseMessage {
  action: MessageAction;
}

/**
 * Message for getting prompts
 */
interface GetPromptsMessage extends BaseMessage {
  action: "getPrompts";
}

/**
 * Message for getting labels
 */
interface GetLabelsMessage extends BaseMessage {
  action: "getLabels";
}

/**
 * Message for saving a prompt
 */
interface SavePromptMessage extends BaseMessage {
  action: "savePrompt";
  prompt: Prompt;
}

/**
 * Message for deleting a prompt
 */
interface DeletePromptMessage extends BaseMessage {
  action: "deletePrompt";
  name: string;
}

/**
 * Message for saving a label
 */
interface SaveLabelMessage extends BaseMessage {
  action: "saveLabel";
  label: Label;
  oldName?: string;
}

/**
 * Message for deleting a label
 */
interface DeleteLabelMessage extends BaseMessage {
  action: "deleteLabel";
  name: string;
}

/**
 * Message for refining a prompt
 * The UI sends the prompt name, and we'll fetch the full prompt from storage
 */
interface RefinePromptMessage extends BaseMessage {
  action: "refinePrompt";
  name: string;
}

/**
 * Message for generating clarifying questions
 */
interface GenerateClarifyingQuestionsMessage extends BaseMessage {
  action: "generateClarifyingQuestions";
  promptContent: string;
  labelContext?: string;
  label?: string;
}

/**
 * Message for generating final refined prompt
 */
interface GenerateFinalRefinedPromptMessage extends BaseMessage {
  action: "generateFinalRefinedPrompt";
  promptContent: string;
  labelContext?: string;
  label?: string;
  conversationHistory: ConversationMessage[];
}

/**
 * Message for getting settings
 */
interface GetSettingsMessage extends BaseMessage {
  action: "getSettings";
}

/**
 * Message for setting provider API key
 */
interface SetProviderApiKeyMessage extends BaseMessage {
  action: "setProviderApiKey";
  providerId: ProviderId;
  apiKey: string;
}

/**
 * Message for deleting provider API key
 */
interface DeleteProviderApiKeyMessage extends BaseMessage {
  action: "deleteProviderApiKey";
  providerId: ProviderId;
}

/**
 * Message for setting selected provider
 */
interface SetSelectedProviderMessage extends BaseMessage {
  action: "setSelectedProvider";
  providerId: ProviderId;
}

/**
 * Ping message to wake up the service worker
 */
interface PingMessage extends BaseMessage {
  action: "ping";
}

/**
 * Union type for all possible messages
 */
type Message =
  | PingMessage
  | GetPromptsMessage
  | GetLabelsMessage
  | SavePromptMessage
  | DeletePromptMessage
  | SaveLabelMessage
  | DeleteLabelMessage
  | RefinePromptMessage
  | GenerateClarifyingQuestionsMessage
  | GenerateFinalRefinedPromptMessage
  | GetSettingsMessage
  | SetProviderApiKeyMessage
  | DeleteProviderApiKeyMessage
  | SetSelectedProviderMessage;

/**
 * Response structure sent back to the UI
 */
interface Response {
  success: boolean;
  error?: string;
  prompts?: Prompt[];
  labels?: Label[];
  refinedText?: string;
  needsClarification?: boolean;
  questions?: string[]; // Array of clarifying questions (can be multiple)
  missing?: string[]; // Missing elements identified by the assessment
  importanceScore?: number; // Importance score from 1-5
  providerApiKeys?: ProviderApiKeys;
  selectedProvider?: ProviderId;
}

// ============================================================================
// Message Handler Functions
// ============================================================================

/**
 * Handle "getPrompts" action: Fetch all prompts from storage
 */
async function handleGetPrompts(): Promise<Response> {
  try {
    const prompts = await getAllPrompts();
    return {
      success: true,
      prompts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleGetPrompts:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "getLabels" action: Fetch all labels from storage
 */
async function handleGetLabels(): Promise<Response> {
  try {
    const labels = await getAllLabels();
    return {
      success: true,
      labels,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleGetLabels:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "savePrompt" action: Save or update a prompt
 * Returns the updated list of prompts so the UI can refresh
 */
async function handleSavePrompt(message: SavePromptMessage): Promise<Response> {
  try {
    // Validate input
    if (!message.prompt) {
      return {
        success: false,
        error: "Prompt object is required",
      };
    }
    if (!message.prompt.name || message.prompt.name.trim() === "") {
      return {
        success: false,
        error: "Prompt name cannot be empty",
      };
    }

    // Save the prompt
    await savePrompt(message.prompt);

    // Return updated prompts list for UI refresh
    const prompts = await getAllPrompts();
    return {
      success: true,
      prompts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleSavePrompt:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "deletePrompt" action: Delete a prompt by name
 * Returns the updated list of prompts so the UI can refresh
 */
async function handleDeletePrompt(
  message: DeletePromptMessage
): Promise<Response> {
  try {
    // Validate input
    if (!message.name || message.name.trim() === "") {
      return {
        success: false,
        error: "Prompt name is required",
      };
    }

    // Delete the prompt
    await deletePrompt(message.name);

    // Return updated prompts list for UI refresh
    const prompts = await getAllPrompts();
    return {
      success: true,
      prompts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleDeletePrompt:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "saveLabel" action: Save or update a label (with optional rename)
 * Returns the updated list of labels so the UI can refresh
 */
async function handleSaveLabel(message: SaveLabelMessage): Promise<Response> {
  try {
    // Validate input
    if (!message.label) {
      return {
        success: false,
        error: "Label object is required",
      };
    }
    if (!message.label.name || message.label.name.trim() === "") {
      return {
        success: false,
        error: "Label name cannot be empty",
      };
    }

    // Save the label (with optional oldName for rename)
    await saveLabel(message.label, message.oldName);

    // Return updated labels list for UI refresh
    // Also return prompts since label changes might affect prompts (e.g., rename)
    const [labels, prompts] = await Promise.all([
      getAllLabels(),
      getAllPrompts(),
    ]);

    return {
      success: true,
      labels,
      prompts, // Include prompts in case label rename affected them
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleSaveLabel:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "deleteLabel" action: Delete a label by name
 * Returns updated lists of both labels and prompts (since prompts may have changed)
 */
async function handleDeleteLabel(
  message: DeleteLabelMessage
): Promise<Response> {
  try {
    // Validate input
    if (!message.name || message.name.trim() === "") {
      return {
        success: false,
        error: "Label name is required",
      };
    }

    // Delete the label (this also removes it from all prompts)
    await deleteLabel(message.name);

    // Return updated lists since label deletion affects prompts
    const [labels, prompts] = await Promise.all([
      getAllLabels(),
      getAllPrompts(),
    ]);

    return {
      success: true,
      labels,
      prompts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleDeleteLabel:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "refinePrompt" action: Refine a prompt using AI with label contexts
 *
 * Process:
 * 1. Fetch the prompt by name from storage
 * 2. If prompt not found, return error
 * 3. Collect all labels referenced by the prompt
 * 4. Combine label contexts into a single context string
 * 5. Use the first label (if any) as a hint (importance is now derived from prompt content)
 * 6. Call refinePrompt with prompt content, combined context, and label
 * 7. Return the refined text or clarification request (does NOT auto-save to storage)
 */
async function handleRefinePrompt(
  message: RefinePromptMessage
): Promise<Response> {
  try {
    // Validate input
    if (!message.name || message.name.trim() === "") {
      return {
        success: false,
        error: "Prompt name is required",
      };
    }

    // Fetch the prompt from storage
    const prompt = await getPrompt(message.name);
    if (!prompt) {
      return {
        success: false,
        error: `Prompt "${message.name}" not found`,
      };
    }

    // Collect context from all labels associated with this prompt
    let contextText = "";
    if (prompt.labels && prompt.labels.length > 0) {
      // Get all labels to find the ones referenced by this prompt
      const allLabels = await getAllLabels();

      // Filter to only the labels referenced by this prompt
      const relevantLabels = allLabels.filter((label) =>
        prompt.labels.includes(label.name)
      );

      // Combine context texts from all relevant labels
      // Join with newlines and prefix each with label name for clarity
      const contextParts = relevantLabels.map(
        (label) => `[${label.name}]: ${label.context}`
      );
      contextText = contextParts.join("\n\n");
    }

    // Use the first label as a hint (or empty string if none)
    // Importance is now derived from the prompt content itself, not the label
    const labelHint =
      prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : "";

    // Get the selected provider ID (or undefined to use selected provider)
    const providerId = await getSelectedProvider();

    // Call AI refinement function
    // Note: This requires host permissions in manifest.json for the AI API endpoint
    const result = await refinePrompt(
      prompt.content,
      contextText,
      labelHint,
      providerId
    );

    // Handle the result: either success with refined text, or clarification needed
    if (result.success) {
      return {
        success: true,
        refinedText: result.refinedPrompt,
        importanceScore: result.importanceScore,
      };
    } else {
      // Clarification needed - return the questions to ask
      return {
        success: true, // Still success, just needs clarification
        needsClarification: true,
        questions: result.questions,
        missing: result.missing,
        importanceScore: result.importanceScore,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleRefinePrompt:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "getSettings" action: Get all provider settings
 */
async function handleGetSettings(): Promise<Response> {
  try {
    const providerApiKeys = await getAllProviderApiKeys();
    const selectedProvider = await getSelectedProvider();

    return {
      success: true,
      providerApiKeys,
      selectedProvider,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleGetSettings:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "setProviderApiKey" action: Set API key for a provider
 */
async function handleSetProviderApiKey(
  message: SetProviderApiKeyMessage
): Promise<Response> {
  try {
    await setProviderApiKey(message.providerId, message.apiKey);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleSetProviderApiKey:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "deleteProviderApiKey" action: Delete API key for a provider
 */
async function handleDeleteProviderApiKey(
  message: DeleteProviderApiKeyMessage
): Promise<Response> {
  try {
    await deleteProviderApiKey(message.providerId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleDeleteProviderApiKey:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "setSelectedProvider" action: Set the selected provider
 */
async function handleSetSelectedProvider(
  message: SetSelectedProviderMessage
): Promise<Response> {
  try {
    await setSelectedProvider(message.providerId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleSetSelectedProvider:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "generateClarifyingQuestions" action: Generate clarifying questions for a prompt
 * This is used by the ClarificationChat component to get initial questions.
 */
async function handleGenerateClarifyingQuestions(
  message: GenerateClarifyingQuestionsMessage
): Promise<Response> {
  try {
    // Validate input
    if (!message.promptContent || message.promptContent.trim() === "") {
      return {
        success: false,
        error: "Prompt content is required",
      };
    }

    const labelContext = message.labelContext || "";
    const label = message.label || "";

    // Get the selected provider ID (or undefined to use selected provider)
    const providerId = await getSelectedProvider();

    // Generate clarifying questions
    const result = await generateClarifyingQuestions(
      message.promptContent,
      labelContext,
      label,
      providerId
    );

    return {
      success: true,
      questions: result.questions,
      missing: result.missing,
      importanceScore: result.importanceScore,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleGenerateClarifyingQuestions:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle "generateFinalRefinedPrompt" action: Generate the final refined prompt
 * This is used by the ClarificationChat component after all questions are answered.
 */
async function handleGenerateFinalRefinedPrompt(
  message: GenerateFinalRefinedPromptMessage
): Promise<Response> {
  try {
    // Validate input
    if (!message.promptContent || message.promptContent.trim() === "") {
      return {
        success: false,
        error: "Prompt content is required",
      };
    }

    if (
      !message.conversationHistory ||
      !Array.isArray(message.conversationHistory)
    ) {
      return {
        success: false,
        error: "Conversation history is required",
      };
    }

    const labelContext = message.labelContext || "";
    const label = message.label || "";

    // Get the selected provider ID (or undefined to use selected provider)
    const providerId = await getSelectedProvider();

    // Generate final refined prompt
    const result = await generateFinalRefinedPrompt(
      message.promptContent,
      labelContext,
      label,
      message.conversationHistory,
      providerId
    );

    return {
      success: true,
      refinedText: result.refinedPrompt,
      importanceScore: result.importanceScore,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in handleGenerateFinalRefinedPrompt:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Main Message Listener
// ============================================================================

/**
 * Main message handler that routes incoming messages to the appropriate handler
 *
 * Uses the Promise pattern for Manifest V3 service workers:
 * - Returns a Promise from the listener
 * - Chrome automatically sends the resolved value as the response
 * - Errors are caught and returned as error responses
 */
function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (response: Response) => void
): boolean | Promise<Response> {
  // Use Promise pattern for MV3 service workers
  // Returning a Promise tells Chrome to wait for it and send the resolved value
  return (async (): Promise<Response> => {
    try {
      // Route to appropriate handler based on action
      switch (message.action) {
        case "ping":
          // Ping handler - just respond immediately to wake up the service worker
          return { success: true };

        case "getPrompts":
          return await handleGetPrompts();

        case "getLabels":
          return await handleGetLabels();

        case "savePrompt":
          return await handleSavePrompt(message);

        case "deletePrompt":
          return await handleDeletePrompt(message);

        case "saveLabel":
          return await handleSaveLabel(message);

        case "deleteLabel":
          return await handleDeleteLabel(message);

        case "refinePrompt":
          return await handleRefinePrompt(message);

        case "generateClarifyingQuestions":
          return await handleGenerateClarifyingQuestions(message);

        case "generateFinalRefinedPrompt":
          return await handleGenerateFinalRefinedPrompt(message);

        case "getSettings":
          return await handleGetSettings();

        case "setProviderApiKey":
          return await handleSetProviderApiKey(message);

        case "deleteProviderApiKey":
          return await handleDeleteProviderApiKey(message);

        case "setSelectedProvider":
          return await handleSetSelectedProvider(message);

        default:
          // TypeScript should catch this, but runtime safety check
          const unknownAction = (message as any).action;
          console.error(`Unknown action: ${unknownAction}`);
          return {
            success: false,
            error: `Unknown action: ${unknownAction}`,
          };
      }
    } catch (error) {
      // Catch-all for any unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Unexpected error in message handler:", errorMessage);
      return {
        success: false,
        error: `Unexpected error: ${errorMessage}`,
      };
    }
  })();
}

/**
 * Handle messages from persistent connections
 */
async function handleConnectionMessage(
  message: any,
  port: chrome.runtime.Port
): Promise<void> {
  const messageId = message.messageId;
  const actualMessage: Message = {
    action: message.action,
    ...(message.prompt && { prompt: message.prompt }),
    ...(message.label && { label: message.label }),
    ...(message.oldName && { oldName: message.oldName }),
    ...(message.name && { name: message.name }),
    ...(message.providerId && { providerId: message.providerId }),
    ...(message.apiKey && { apiKey: message.apiKey }),
    ...(message.conversationHistory && {
      conversationHistory: message.conversationHistory,
    }),
    ...(message.userAnswer && { userAnswer: message.userAnswer }),
    ...(message.promptContent && { promptContent: message.promptContent }),
    ...(message.labelContext && { labelContext: message.labelContext }),
    ...(message.label && { label: message.label }),
  } as Message;
  try {
    const response = await handleMessage(
      actualMessage,
      {} as chrome.runtime.MessageSender,
      () => {}
    );
    // Ensure response is an object before spreading
    const responseObj =
      response && typeof response === "object"
        ? response
        : { success: false, error: "Invalid response" };
    port.postMessage({ messageId, ...responseObj });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    port.postMessage({
      messageId,
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Set up connection listener for persistent connections
 * This keeps the service worker alive while connections are open
 */
try {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
      console.log("Side panel connection established");
      port.onMessage.addListener((message) => {
        handleConnectionMessage(message, port);
      });
      port.onDisconnect.addListener(() => {
        console.log("Side panel connection closed");
      });
    }
  });
  console.log("Connection listener added successfully");
} catch (error) {
  console.error("Failed to add connection listener:", error);
}

/**
 * Set up the message listener for one-off messages (fallback)
 *
 * In Manifest V3, service workers can use the Promise pattern:
 * - If the listener returns a Promise, Chrome waits for it and sends the resolved value
 * - This is cleaner than the callback pattern with sendResponse and returning true
 */
try {
  chrome.runtime.onMessage.addListener(handleMessage);
  console.log("Message listener added successfully");
} catch (error) {
  console.error("Failed to add message listener:", error);
}

// ============================================================================
// Extension Icon Click Handler
// ============================================================================

/**
 * Handle extension icon click to open the side panel
 * This makes the sidebar open when clicking the extension icon,
 * not just when selecting "open sidebar" from the dropdown
 */
try {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log("Side panel opened successfully");
    } catch (error) {
      console.error("Error opening side panel:", error);
    }
  });
  console.log("Action click listener added successfully");
} catch (error) {
  console.error("Failed to add action click listener:", error);
}

// ============================================================================
// Optional: Storage Change Listener
// ============================================================================

/**
 * Optional: Listen for storage changes to proactively notify UI
 *
 * This can be useful if multiple parts of the extension modify storage
 * and you want other parts to update automatically. For now, we rely on
 * the UI requesting fresh data after operations, so this is commented out.
 *
 * Uncomment and implement if you want proactive updates:
 */
/*
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Notify side panel of changes
    // You could use chrome.runtime.sendMessage to send updates
    // or use chrome.storage.onChanged in the side panel directly
  }
});
*/

// ============================================================================
// Service Worker Lifecycle
// ============================================================================

/**
 * Service worker initialization
 *
 * Manifest V3 service workers are event-driven and may be terminated
 * when idle. This is a good place to log initialization or set up
 * any one-time initialization logic.
 */
console.log("Background orchestrator service worker initialized");

// Verify Chrome APIs are available
if (typeof chrome === "undefined" || !chrome.runtime) {
  console.error("Chrome runtime API is not available!");
} else {
  console.log("Chrome runtime API is available");
}

// Verify message listener is set up
if (chrome.runtime.onMessage.hasListener(handleMessage)) {
  console.log("Message listener is registered");
} else {
  console.warn("Message listener may not be registered correctly");
}

// ============================================================================
// Keep Service Worker Active
// ============================================================================

/**
 * Keep the service worker alive using chrome.alarms API
 * This is more reliable than setInterval in service workers
 *
 * Note: Service workers in MV3 can still be terminated, but this helps
 * keep them active longer when there's activity.
 */
function startKeepAlive() {
  try {
    // Use chrome.alarms API instead of setInterval for service workers
    // This is the recommended approach for periodic tasks in service workers
    chrome.alarms.create("keepAlive", {
      delayInMinutes: 0.5, // 30 seconds
      periodInMinutes: 0.5, // Repeat every 30 seconds
    });

    // Listen for alarm events to keep the service worker active
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "keepAlive") {
        // Perform a lightweight operation to keep the service worker active
        chrome.storage.local.get(null, () => {
          // This keeps the service worker active
        });
      }
    });
  } catch (error) {
    console.error("Error setting up keepalive:", error);
  }
}

// Start keepalive when service worker initializes
// This will help keep the service worker active between message sends
startKeepAlive();
