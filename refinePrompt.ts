/**
 * Prompt Refinement Module (Importance-from-Prompt + Unlimited Clarifications)
 *
 * Changes vs old version:
 * - Importance is scored from the prompt content itself (not label).
 * - One structured "assessment" LLM call returns importance + missing + clarifying questions.
 * - Clarification step can ask as many questions as needed (batch).
 * - Final refined prompt is forced to be prompt text only (and we also strip common prefixes defensively).
 */

import { chatCompletion, type ChatMessage } from "./providerApi";
import { getProviderApiKey, getSelectedProvider } from "./providerStorage";
import { getProvider, type ProviderId, type ProviderConfig } from "./providers";

// ============================================================================
// Types
// ============================================================================

export type ImportanceScore = 1 | 2 | 3 | 4 | 5;

export interface PromptAssessment {
  importanceScore: ImportanceScore; // 1 low, 5 high
  missing: string[]; // e.g. ["audience", "format", "constraints", ...]
  questions: string[]; // ask user directly (can be empty)
  // Optional, for debugging/telemetry. Do not show to end users unless you want to.
  rationale?: string;
}

export interface RefineResultSuccess {
  success: true;
  refinedPrompt: string;
  importanceScore: ImportanceScore;
}

export interface RefineResultClarification {
  success: false;
  needsClarification: true;
  importanceScore: ImportanceScore;
  questions: string[]; // can be many
  missing: string[];
}

export type RefineResult = RefineResultSuccess | RefineResultClarification;

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ContinueConversationResult {
  isComplete: boolean;
  importanceScore: ImportanceScore;
  questions?: string[];
  missing?: string[];
  refinedPrompt?: string;
}

// ============================================================================
// Utilities
// ============================================================================

function clampImportance(n: number): ImportanceScore {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Extract the first top-level JSON object from a model response.
 * Helps when providers occasionally wrap JSON with extra text.
 */
function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Enforce "prompt text only" output (defense-in-depth).
 */
function stripCommonPrefixes(s: string): string {
  let out = s.trim();
  const prefixes = [
    /^refined prompt:\s*/i,
    /^here is (the )?refined prompt:\s*/i,
    /^improved prompt:\s*/i,
    /^refined version:\s*/i,
    /^final prompt:\s*/i,
  ];
  for (const p of prefixes) out = out.replace(p, "");
  return out.trim();
}

async function getProviderAndApiKey(
  providerId?: ProviderId
): Promise<{ provider: ProviderConfig; apiKey: string }> {
  const selectedProviderId = providerId || (await getSelectedProvider());
  if (!selectedProviderId) throw new Error("No provider selected.");

  const provider = getProvider(selectedProviderId);
  const apiKey = await getProviderApiKey(selectedProviderId);
  if (!apiKey)
    throw new Error(`API key not found for provider "${provider.name}".`);

  return { provider, apiKey };
}

// ============================================================================
// Core LLM Calls
// ============================================================================

/**
 * Assess the prompt: importance scoring + missing elements + questions (unlimited).
 *
 * ImportanceScore rubric (1-5):
 * 1: casual, low stakes, personal experimentation
 * 2: general work/school, moderate consequence
 * 3: business/production usage, reputational or operational impact
 * 4: legal/medical/financial adjacent, compliance/security risk, or irreversible decisions
 * 5: explicitly high-stakes domains or instructions that could cause harm if wrong
 *
 * NOTE: label/context can bias the assessment slightly, but should not override prompt content.
 */
async function assessPrompt(
  originalText: string,
  contextText: string,
  label: string,
  provider: ProviderConfig,
  apiKey: string
): Promise<PromptAssessment> {
  const system: ChatMessage = {
    role: "system",
    content: [
      "You are a prompt-quality auditor.",
      "Return ONLY a single valid JSON object. No markdown. No extra text.",
      "",
      "You will:",
      "1) Assign an importanceScore from 1 to 5 based primarily on the prompt content (NOT the label).",
      "2) List missing details that would materially improve the prompt.",
      "3) Provide a list of clarifying questions to ask the user directly. You may ask as many as needed.",
      "",
      "Output schema:",
      `{`,
      `  "importanceScore": 1|2|3|4|5,`,
      `  "missing": string[],`,
      `  "questions": string[],`,
      `  "rationale": string`,
      `}`,
      "",
      "Rules for questions:",
      "- Ask questions that unblock writing a high-quality prompt.",
      "- Avoid duplicates and vague questions.",
      "- Prefer concrete questions about audience, goal, constraints, format, examples, success criteria, and edge cases.",
      "",
      "Hard requirement: JSON only.",
    ].join("\n"),
  };

  const user: ChatMessage = {
    role: "user",
    content: [
      `PROMPT:\n${originalText}`,
      contextText ? `\nCONTEXT:\n${contextText}` : "",
      label ? `\nLABEL (optional hint only):\n${label}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const resp = await chatCompletion(provider, apiKey, {
    model: provider.defaultModel,
    messages: [system, user],
    temperature: 0.2,
  });

  const raw = resp.content.trim();
  const jsonText = extractJsonObject(raw) ?? raw;
  const parsed = safeJsonParse<PromptAssessment>(jsonText);

  if (!parsed) {
    // Fail “open” but still be deterministic and safe
    return {
      importanceScore: 3,
      missing: [],
      questions: ["What is the desired output format and target audience?"],
      rationale:
        "Failed to parse assessment JSON; defaulted to moderate importance.",
    };
  }

  return {
    importanceScore: clampImportance(Number(parsed.importanceScore)),
    missing: Array.isArray(parsed.missing)
      ? parsed.missing.filter((s) => typeof s === "string")
      : [],
    questions: Array.isArray(parsed.questions)
      ? parsed.questions.filter((s) => typeof s === "string" && s.trim())
      : [],
    rationale:
      typeof parsed.rationale === "string" ? parsed.rationale : undefined,
  };
}

/**
 * Given the existing conversation, decide whether more clarification is needed.
 * If needed, return another batch of questions (unlimited). If complete, say so.
 */
async function decideNextClarifications(
  originalText: string,
  contextText: string,
  label: string,
  conversationHistory: ConversationMessage[],
  provider: ProviderConfig,
  apiKey: string
): Promise<{
  done: boolean;
  importanceScore: ImportanceScore;
  missing: string[];
  questions: string[];
}> {
  const system: ChatMessage = {
    role: "system",
    content: [
      "You are managing a clarification chat to improve a prompt.",
      "Return ONLY JSON. No markdown. No extra text.",
      "",
      "Given the original prompt and the conversation so far, decide:",
      "- If you still need information, return more questions (as many as needed).",
      "- If you have enough, return done=true and no questions.",
      "",
      "Output schema:",
      `{`,
      `  "done": boolean,`,
      `  "importanceScore": 1|2|3|4|5,`,
      `  "missing": string[],`,
      `  "questions": string[]`,
      `}`,
      "",
      "Rules:",
      "- Questions must be direct to the user and actionable.",
      "- Do not ask for information you already have in the conversation.",
      "- Avoid repeating earlier questions.",
    ].join("\n"),
  };

  const msgs: ChatMessage[] = [
    system,
    { role: "user", content: `ORIGINAL PROMPT:\n${originalText}` },
  ];

  if (contextText)
    msgs.push({ role: "user", content: `CONTEXT:\n${contextText}` });
  if (label)
    msgs.push({
      role: "user",
      content: `LABEL (optional hint only):\n${label}`,
    });

  msgs.push({
    role: "user",
    content:
      "CLARIFICATION CHAT SO FAR:\n" +
      conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n"),
  });

  const resp = await chatCompletion(provider, apiKey, {
    model: provider.defaultModel,
    messages: msgs,
    temperature: 0.2,
  });

  const raw = resp.content.trim();
  const jsonText = extractJsonObject(raw) ?? raw;
  const parsed = safeJsonParse<any>(jsonText);

  if (!parsed) {
    return {
      done: false,
      importanceScore: 3,
      missing: [],
      questions: [
        "What output format do you want (bullets, JSON, email, etc.)?",
      ],
    };
  }

  return {
    done: Boolean(parsed.done),
    importanceScore: clampImportance(Number(parsed.importanceScore)),
    missing: Array.isArray(parsed.missing)
      ? parsed.missing.filter((s: any) => typeof s === "string")
      : [],
    questions: Array.isArray(parsed.questions)
      ? parsed.questions.filter((s: any) => typeof s === "string" && s.trim())
      : [],
  };
}

/**
 * Generate final refined prompt.
 * Hard requirement: output is prompt text only.
 */
async function generateRefinedPromptTextOnly(
  originalText: string,
  contextText: string,
  label: string,
  conversationHistory: ConversationMessage[],
  provider: ProviderConfig,
  apiKey: string
): Promise<string> {
  const system: ChatMessage = {
    role: "system",
    content: [
      "You rewrite prompts into a clearer, more complete, and verbose final prompt.",
      "Hard requirements:",
      "- Output ONLY the prompt text.",
      '- Do NOT add labels like "Refined prompt:" or any preface.',
      "- Do NOT include markdown fences.",
      "- Incorporate all relevant info from the clarification chat.",
      "",
      "Write a prompt that is:",
      "- Unambiguous and ready to run in an LLM",
      "- Verbose and detailed, including all necessary context and specifications",
      "- Comprehensive, covering edge cases and providing clear instructions",
      "- Well-structured with clear sections if needed",
      "- Explicit about expectations, constraints, and desired output format",
      "",
      "Make the prompt as detailed and verbose as possible while remaining clear and actionable.",
    ].join("\n"),
  };

  const user: ChatMessage = {
    role: "user",
    content: [
      `ORIGINAL PROMPT:\n${originalText}`,
      contextText ? `\nCONTEXT:\n${contextText}` : "",
      label ? `\nLABEL (optional hint only):\n${label}` : "",
      "\nCLARIFICATION CHAT (Q/A):\n" +
        conversationHistory
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n"),
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const resp = await chatCompletion(provider, apiKey, {
    model: provider.defaultModel,
    messages: [system, user],
    temperature: 0.4,
  });

  const refined = stripCommonPrefixes(resp.content);
  if (!refined) throw new Error("API returned no refined prompt content.");
  return refined;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Entry point:
 * - Assess prompt and return clarifying questions if needed.
 * - Otherwise refine immediately.
 */
export async function refinePrompt(
  originalText: string,
  contextText: string,
  label: string,
  providerId?: ProviderId
): Promise<RefineResult> {
  const { provider, apiKey } = await getProviderAndApiKey(providerId);

  const assessment = await assessPrompt(
    originalText,
    contextText,
    label,
    provider,
    apiKey
  );

  // Simple gating rule:
  // - For low importance (1-2), tolerate missing details: only ask if questions are truly necessary.
  // - For medium (3), ask if there are meaningful gaps.
  // - For high (4-5), ask unless it's already very complete.
  //
  // We implement that by trusting the model's questions, but also preventing "question spam"
  // for low importance by limiting questions if score <= 2.
  const score = assessment.importanceScore;

  let questions = assessment.questions;
  if (score <= 2) questions = questions.slice(0, 3); // keep it lightweight
  // For higher importance, allow unlimited questions.

  const needsClarification = questions.length > 0;

  if (needsClarification) {
    return {
      success: false,
      needsClarification: true,
      importanceScore: score,
      questions,
      missing: assessment.missing,
    };
  }

  // Refine immediately (no clarification)
  const refinedPrompt = await generateRefinedPromptTextOnly(
    originalText,
    contextText,
    label,
    [],
    provider,
    apiKey
  );

  return { success: true, refinedPrompt, importanceScore: score };
}

/**
 * Continue after the UI asks the user one or more questions.
 *
 * Expected conversationHistory shape:
 * - assistant: asked batch questions (or single question)
 * - user: answered (single message can answer multiple questions)
 * - ...repeat
 */
export async function continueClarificationConversation(
  originalText: string,
  contextText: string,
  label: string,
  conversationHistory: ConversationMessage[],
  providerId?: ProviderId
): Promise<ContinueConversationResult> {
  const { provider, apiKey } = await getProviderAndApiKey(providerId);

  const next = await decideNextClarifications(
    originalText,
    contextText,
    label,
    conversationHistory,
    provider,
    apiKey
  );

  if (!next.done) {
    return {
      isComplete: false,
      importanceScore: next.importanceScore,
      questions: next.questions,
      missing: next.missing,
    };
  }

  const refinedPrompt = await generateRefinedPromptTextOnly(
    originalText,
    contextText,
    label,
    conversationHistory,
    provider,
    apiKey
  );

  return {
    isComplete: true,
    importanceScore: next.importanceScore,
    refinedPrompt,
  };
}

/**
 * Check if a prompt appears to be already refined (very detailed/verbose).
 * This helps skip questions when refining an already-refined prompt.
 */
function isPromptAlreadyRefined(text: string): boolean {
  // Check if prompt is already very detailed/verbose
  // Criteria: length > 500 chars, has multiple sentences, has structured elements
  const wordCount = text.trim().split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const hasStructure = /(?:step|section|requirement|constraint|format|output|input|example|note|important|must|should|will|shall)/i.test(text);
  
  // If prompt is long, has multiple sentences, and has structured elements, likely already refined
  return wordCount > 100 && sentenceCount > 3 && hasStructure;
}

/**
 * Generate clarifying questions for a prompt.
 * This is used by the ClarificationChat component to get initial questions.
 * If the prompt is already refined, returns empty questions array.
 */
export async function generateClarifyingQuestions(
  originalText: string,
  contextText: string,
  label: string,
  providerId?: ProviderId
): Promise<{
  questions: string[];
  importanceScore: ImportanceScore;
  missing: string[];
}> {
  const { provider, apiKey } = await getProviderAndApiKey(providerId);

  // If prompt is already refined, skip questions
  if (isPromptAlreadyRefined(originalText)) {
    // Still get importance score for consistency
    const assessment = await assessPrompt(
      originalText,
      contextText,
      label,
      provider,
      apiKey
    );
    return {
      questions: [], // No questions needed - prompt is already refined
      importanceScore: assessment.importanceScore,
      missing: [],
    };
  }

  const assessment = await assessPrompt(
    originalText,
    contextText,
    label,
    provider,
    apiKey
  );

  const score = assessment.importanceScore;
  let questions = assessment.questions;
  // Limit questions for low importance prompts to keep it lightweight
  if (score <= 2) questions = questions.slice(0, 3);

  return {
    questions,
    importanceScore: score,
    missing: assessment.missing,
  };
}

/**
 * Generate the final refined prompt after clarification conversation.
 * This is used by the ClarificationChat component to get the final refined prompt.
 */
export async function generateFinalRefinedPrompt(
  originalText: string,
  contextText: string,
  label: string,
  conversationHistory: ConversationMessage[],
  providerId?: ProviderId
): Promise<{
  refinedPrompt: string;
  importanceScore: ImportanceScore;
}> {
  const { provider, apiKey } = await getProviderAndApiKey(providerId);

  // Generate the refined prompt
  const refinedPrompt = await generateRefinedPromptTextOnly(
    originalText,
    contextText,
    label,
    conversationHistory,
    provider,
    apiKey
  );

  // Get importance score from a quick assessment
  // Note: This could be optimized by storing the score from initial assessment,
  // but for now we assess again to get the score
  const assessment = await assessPrompt(
    originalText,
    contextText,
    label,
    provider,
    apiKey
  );

  return {
    refinedPrompt,
    importanceScore: assessment.importanceScore,
  };
}
