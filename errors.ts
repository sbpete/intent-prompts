/**
 * Error Classes for the Extension
 */

/**
 * Error thrown when clarification is needed for prompt refinement
 */
export class ClarificationNeededError extends Error {
  question: string;
  constructor(question: string) {
    super("Clarification needed");
    this.name = "ClarificationNeededError";
    this.question = question;
  }
}

