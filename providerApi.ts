/**
 * Provider API Adapter Module
 * 
 * Handles API calls to different LLM providers with a unified interface
 */

import type { ProviderConfig, ProviderId } from "./providers";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
}

/**
 * Make a chat completion API call to the specified provider
 */
export async function chatCompletion(
  provider: ProviderConfig,
  apiKey: string,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const { id, apiBaseUrl, apiKeyHeader } = provider;
  const { model, messages, temperature = 0.7 } = request;

  // Log the outgoing request (omit apiKey)
  console.log("[LLM REQUEST]", {
    provider: id,
    model,
    temperature,
    messages,
  });

  try {
    // Build request based on provider
    const response =
      id === "openai"
        ? await openAIChatCompletion(apiKey, apiBaseUrl, model, messages, temperature)
        : id === "anthropic"
          ? await anthropicChatCompletion(apiKey, apiBaseUrl, model, messages, temperature)
          : id === "google"
            ? await googleChatCompletion(apiKey, apiBaseUrl, model, messages, temperature)
            : (() => {
                throw new Error(`Unsupported provider: ${id}`);
              })();

    console.log("[LLM RESPONSE]", {
      provider: id,
      model,
      contentPreview: response.content.slice(0, 500),
    });

    return response;
  } catch (err) {
    console.error("[LLM ERROR]", {
      provider: id,
      model,
      temperature,
      messages,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * OpenAI API call
 */
async function openAIChatCompletion(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature: number
): Promise<ChatCompletionResponse> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI API returned no content");
  }

  return { content };
}

/**
 * Anthropic API call
 */
async function anthropicChatCompletion(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature: number
): Promise<ChatCompletionResponse> {
  // Anthropic uses a different message format (no system role in messages array)
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const body: any = {
    model,
    max_tokens: 4096,
    temperature,
    messages: conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text?.trim();
  if (!content) {
    throw new Error("Anthropic API returned no content");
  }

  return { content };
}

/**
 * Google Gemini API call
 */
async function googleChatCompletion(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature: number
): Promise<ChatCompletionResponse> {
  // Google uses a different message format
  const systemInstruction = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const contents = conversationMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    generationConfig: {
      temperature,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction.content }],
    };
  }

  const response = await fetch(
    `${baseUrl}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Google API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) {
    throw new Error("Google API returned no content");
  }

  return { content };
}

