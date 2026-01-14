/**
 * Provider Settings Storage Module
 * 
 * Handles storage of provider API keys and selected provider
 */

import type { ProviderId } from "./providers";
import type { ProviderApiKeys } from "./storage";

// Chrome API Type Declarations
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

const STORAGE_KEYS = {
  PROVIDER_API_KEYS: "provider_api_keys",
  SELECTED_PROVIDER: "selected_provider",
} as const;

/**
 * Storage wrapper
 */
const storage = {
  async get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Storage get error: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(new Error(`Storage get failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  },

  async set(items: { [key: string]: any }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Storage set error: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(new Error(`Storage set failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  },
};

/**
 * Get API key for a specific provider
 */
export async function getProviderApiKey(providerId: ProviderId): Promise<string | undefined> {
  try {
    const data = await storage.get(STORAGE_KEYS.PROVIDER_API_KEYS);
    const keys: ProviderApiKeys = data[STORAGE_KEYS.PROVIDER_API_KEYS] || {};
    return keys[providerId];
  } catch (error) {
    console.error(`Error getting API key for provider ${providerId}:`, error);
    return undefined;
  }
}

/**
 * Set API key for a specific provider
 */
export async function setProviderApiKey(providerId: ProviderId, apiKey: string): Promise<void> {
  try {
    const data = await storage.get(STORAGE_KEYS.PROVIDER_API_KEYS);
    const keys: ProviderApiKeys = data[STORAGE_KEYS.PROVIDER_API_KEYS] || {};
    keys[providerId] = apiKey;
    await storage.set({ [STORAGE_KEYS.PROVIDER_API_KEYS]: keys });
  } catch (error) {
    throw new Error(
      `Failed to set API key for provider ${providerId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete API key for a specific provider
 */
export async function deleteProviderApiKey(providerId: ProviderId): Promise<void> {
  try {
    const data = await storage.get(STORAGE_KEYS.PROVIDER_API_KEYS);
    const keys: ProviderApiKeys = data[STORAGE_KEYS.PROVIDER_API_KEYS] || {};
    delete keys[providerId];
    await storage.set({ [STORAGE_KEYS.PROVIDER_API_KEYS]: keys });
  } catch (error) {
    throw new Error(
      `Failed to delete API key for provider ${providerId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get all provider API keys (for checking which providers are configured)
 */
export async function getAllProviderApiKeys(): Promise<ProviderApiKeys> {
  try {
    const data = await storage.get(STORAGE_KEYS.PROVIDER_API_KEYS);
    return data[STORAGE_KEYS.PROVIDER_API_KEYS] || {};
  } catch (error) {
    console.error("Error getting all provider API keys:", error);
    return {};
  }
}

/**
 * Get the currently selected provider
 */
export async function getSelectedProvider(): Promise<ProviderId | undefined> {
  try {
    const data = await storage.get(STORAGE_KEYS.SELECTED_PROVIDER);
    return data[STORAGE_KEYS.SELECTED_PROVIDER] as ProviderId | undefined;
  } catch (error) {
    console.error("Error getting selected provider:", error);
    return undefined;
  }
}

/**
 * Set the currently selected provider
 */
export async function setSelectedProvider(providerId: ProviderId): Promise<void> {
  try {
    await storage.set({ [STORAGE_KEYS.SELECTED_PROVIDER]: providerId });
  } catch (error) {
    throw new Error(
      `Failed to set selected provider: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

