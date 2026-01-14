import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, ChevronDown, ChevronUp } from "lucide-react";
import type { Prompt, Label } from "./storage";

/**
 * Conversation message type matching the backend
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Props for the ClarificationChat component
 */
export interface ClarificationChatProps {
  prompt: Prompt;
  labels: Label[];
  onComplete: (refinedText: string) => void;
  onCancel: () => void;
  sendMessage: (message: any) => Promise<any>;
}

/**
 * ClarificationChat Component
 *
 * Displays a chat-like interface for clarifying prompts.
 * Generates 1-3 clarifying questions based on prompt importance.
 */
export const ClarificationChat = ({
  prompt,
  labels,
  onComplete,
  onCancel,
  sendMessage,
}: ClarificationChatProps) => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  
  // Determine if prompt is long enough to need collapsing
  const promptText = prompt.content || "";
  const isLongPrompt = promptText.length > 200 || promptText.split('\n').length > 3;
  const shouldCollapse = isLongPrompt && !isPromptExpanded;

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref for text input to auto-focus
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Get label context
  const labelContext = labels
    .filter((label) => prompt.labels.includes(label.name))
    .map((label) => `[${label.name}]: ${label.context}`)
    .join("\n\n");

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll whenever conversation or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [conversation, isLoading, isGeneratingQuestions]);

  // Generate clarifying questions on mount
  useEffect(() => {
    const generateQuestions = async () => {
      try {
        setIsGeneratingQuestions(true);

        const labelForGating =
          prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : "";

        const questionsResponse = await sendMessage({
          action: "generateClarifyingQuestions",
          promptContent: prompt.content,
          labelContext: labelContext,
          label: labelForGating,
        });

        if (questionsResponse.success && questionsResponse.questions) {
          const generatedQuestions = questionsResponse.questions;
          setQuestions(generatedQuestions);
          
          // If no questions are needed, the prompt is already clear
          // Generate the refined prompt directly and return to editor
          if (generatedQuestions.length === 0) {
            try {
              const refineResponse = await sendMessage({
                action: "generateFinalRefinedPrompt",
                promptContent: prompt.content,
                labelContext: labelContext,
                label: labelForGating,
                conversationHistory: [], // Empty conversation since no questions were needed
              });

              if (refineResponse.success && refineResponse.refinedText) {
                // Return to editor with the refined prompt
                onComplete(refineResponse.refinedText);
                return;
              } else {
                throw new Error(
                  refineResponse.error ||
                    "Failed to generate refined prompt. Please check your API key and try again."
                );
              }
            } catch (refineError) {
              console.error("Error generating refined prompt:", refineError);
              const errorMessage =
                refineError instanceof Error
                  ? refineError.message
                  : "Failed to generate refined prompt. Please check your API key and try again.";
              setError(errorMessage);
              alert(errorMessage);
              // If error occurred during initial question generation, close the chat
              if (questions.length === 0) {
                onCancel();
              }
            }
          } else {
            // Questions are needed, show the first question
            setConversation([
              { role: "assistant" as const, content: generatedQuestions[0] },
            ]);
            // Auto-focus the input when question is ready
            setTimeout(() => {
              textInputRef.current?.focus();
            }, 100);
          }
        } else {
          throw new Error(
            questionsResponse.error || "Failed to generate questions"
          );
        }
      } catch (error) {
        console.error("Error generating questions:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate clarifying questions. Please check your API key and try again.";
        setError(errorMessage);
        alert(errorMessage);
        // If error occurred during initial question generation, close the chat
        onCancel();
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateQuestions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!currentAnswer.trim() || isLoading) return;

    const answer = currentAnswer.trim();
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    // Add user answer to conversation immediately
    const updatedConv: ConversationMessage[] = [
      ...conversation,
      { role: "user" as const, content: answer },
    ];
    setConversation(updatedConv);
    setCurrentAnswer("");
    setIsLoading(true);

    // Logic to determine next step
    if (currentQuestionIndex < questions.length - 1) {
      // Move to next question after a brief delay for natural feel
      setTimeout(() => {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setConversation([
          ...updatedConv,
          { role: "assistant" as const, content: questions[nextIndex] },
        ]);
        setIsLoading(false);
        // Auto-focus the input when next question is ready
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      }, 600);
    } else {
      // All questions answered, generate final refined prompt
      try {
        const labelForGating =
          prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : "";

        const refineResponse = await sendMessage({
          action: "generateFinalRefinedPrompt",
          promptContent: prompt.content,
          labelContext: labelContext,
          label: labelForGating,
          conversationHistory: updatedConv, // Send history including latest answer
        });

        if (refineResponse.success && refineResponse.refinedText) {
          onComplete(refineResponse.refinedText);
        } else {
          const errorMessage =
            refineResponse.error ||
            "Failed to generate refined prompt. Please check your API key and try again.";
          setError(errorMessage);
          alert(errorMessage);
        }
      } catch (error) {
        console.error("Error generating refined prompt:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate refined prompt. Please check your API key and try again.";
        setError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAnswerLater = async () => {
    if (isLoading || isGeneratingQuestions) return;

    setIsLoading(true);

    // If there are more questions, skip to the next one
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setConversation([
        ...conversation,
        { role: "assistant" as const, content: questions[nextIndex] },
      ]);
      setIsLoading(false);
      // Auto-focus the input when next question is ready
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } else {
      // Last question - generate refined prompt with current conversation history
      try {
        const labelForGating =
          prompt.labels && prompt.labels.length > 0 ? prompt.labels[0] : "";

        const refineResponse = await sendMessage({
          action: "generateFinalRefinedPrompt",
          promptContent: prompt.content,
          labelContext: labelContext,
          label: labelForGating,
          conversationHistory: conversation, // Use current conversation without adding empty answer
        });

        if (refineResponse.success && refineResponse.refinedText) {
          onComplete(refineResponse.refinedText);
        } else {
          const errorMessage =
            refineResponse.error ||
            "Failed to generate refined prompt. Please check your API key and try again.";
          setError(errorMessage);
          alert(errorMessage);
        }
      } catch (error) {
        console.error("Error generating refined prompt:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate refined prompt. Please check your API key and try again.";
        setError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>

      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl text-white truncate">
                  Clarifying:{" "}
                  <span className="font-normal">
                    {prompt.name || "Untitled"}
                  </span>
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Help me understand your prompt better
                </p>
              </div>
            </div>
          </div>
          {/* Prompt Display - Collapsible with seamless dropdown */}
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {isLongPrompt ? (
              <>
                <button
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <p className="text-xs font-medium text-white/50 uppercase">
                    Original Prompt
                  </p>
                  {isPromptExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/50" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  )}
                </button>
                {isPromptExpanded && (
                  <div className="px-4 pb-4 max-h-64 overflow-y-auto custom-scrollbar">
                    <p className="text-sm font-light text-white whitespace-pre-wrap">
                      {promptText}
                    </p>
                  </div>
                )}
                {!isPromptExpanded && (
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
                      {promptText}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs font-medium text-white/50 uppercase mb-2">
                  Original Prompt
                </p>
                <p className="text-sm font-light text-white whitespace-pre-wrap">
                  {promptText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 min-h-0 custom-scrollbar flex flex-col">
          {conversation.map((message, index) => {
            const isUser = message.role?.toLowerCase() === "user";
            const isLastMessage = index === conversation.length - 1;
            const isLastAssistantMessage = !isUser && isLastMessage;

            return (
              <div key={index} className="flex flex-col w-full">
                <div className="flex w-full">
                  <div
                    className={`${
                      isUser
                        ? "bg-white text-gray-900 ml-auto"
                        : "bg-white/5 border border-white/10 text-white mr-auto"
                    } rounded-2xl px-5 py-3 max-w-[85%]`}
                  >
                    <p className="text-sm font-light leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
                {isLastAssistantMessage && !isLoading && !isGeneratingQuestions && (
                  <div className="flex w-full mr-auto max-w-[85%] mt-2">
                    <button
                      onClick={handleAnswerLater}
                      disabled={isLoading || isGeneratingQuestions}
                      className="text-sm text-white/60 hover:text-white/80 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Answer later
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading ||
            (isGeneratingQuestions && (
              <div className="flex w-full">
                <div className="flex gap-1.5 h-5 items-center">
                  <span
                    className="w-1 h-1 bg-white/70 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms", animationDuration: "1s" }}
                  />
                  <span
                    className="w-1 h-1 bg-white/70 rounded-full animate-bounce"
                    style={{
                      animationDelay: "200ms",
                      animationDuration: "1s",
                    }}
                  />
                  <span
                    className="w-1 h-1 bg-white/70 rounded-full animate-bounce"
                    style={{
                      animationDelay: "400ms",
                      animationDuration: "1s",
                    }}
                  />
                </div>
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 bg-gray-900 z-10">
          <div className="relative bg-white/5 border border-white/10 rounded-lg transition-colors w-full">
            <textarea
              ref={textInputRef}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your answer..."
              className="w-full p-4 pr-14 resize-none font-light text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-0 border-none"
              style={{
                background: "transparent",
                color: "white",
              }}
              rows={2}
              disabled={isLoading || isGeneratingQuestions}
            />
            <button
              onClick={handleSend}
              disabled={
                !currentAnswer.trim() || isLoading || isGeneratingQuestions
              }
              className="absolute right-3 bottom-3 w-10 h-10 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm pointer-events-auto"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
