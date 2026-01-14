/**
 * LLM Provider Configuration Module
 *
 * Defines supported providers and their API configurations
 */

export type ProviderId = "openai" | "anthropic" | "google";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiBaseUrl: string;
  defaultModel: string;
  models: string[];
  apiKeyHeader: string;
  apiKeyPattern?: RegExp; // Optional pattern to validate API key format
}

/**
 * Supported LLM providers configuration
 */
export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4",
    models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"],
    apiKeyHeader: "Authorization",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    apiBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    apiKeyHeader: "x-api-key",
  },
  google: {
    id: "google",
    name: "Google (Gemini)",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
    apiKeyHeader: "x-goog-api-key",
  },
};

/**
 * Get provider configuration by ID
 */
export function getProvider(id: ProviderId): ProviderConfig {
  return PROVIDERS[id];
}

/**
 * Get all available providers
 */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}
