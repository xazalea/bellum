"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function BrainIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function SendIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function TrashIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CopyIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function UserIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function SparklesIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════

const AVAILABLE_MODELS: Model[] = [
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
  { id: "llama-2-70b", name: "Llama 2 70B", provider: "Meta" },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B", provider: "Mistral" },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>(AVAILABLE_MODELS[0]);
  const [copyNotification, setCopyNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Copy to clipboard
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2000);
  }, []);

  // Clear chat
  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel.id,
          site: "auto",
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let assistantMessage = "";
      let messageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content && data.content !== "done") {
                assistantMessage += data.content;

                if (!messageAdded) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: assistantMessage },
                  ]);
                  messageAdded = true;
                } else {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
                    };
                    return newMessages;
                  });
                }
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
              if (!line.includes("done")) {
                console.debug("Stream line:", line);
              }
            }
          }
        }
      }

      if (!messageAdded && assistantMessage) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage },
        ]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Chat error:", err);
        setError(err.message || "Failed to get response");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message || "Failed to get response"}`,
          },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, loading, messages, selectedModel]);

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--cd-border-default)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-purple-muted)",
                  border: "1px solid rgba(157, 121, 255, 0.15)"
                }}
              >
                <BrainIcon className="w-6 h-6" style={{ color: "var(--cd-purple)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                  AI Chat
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  Access multiple AI models for free
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="cd-badge"
                style={{
                  background: "var(--cd-purple-muted)",
                  borderColor: "rgba(157, 121, 255, 0.15)",
                  color: "var(--cd-purple)"
                }}
              >
                <SparklesIcon className="w-3 h-3" />
                Multi-Provider
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Model Selector */}
            <div className="cd-card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cd-text-primary)" }}>
                Model
              </h3>
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const model = AVAILABLE_MODELS.find((m) => m.id === e.target.value);
                  if (model) setSelectedModel(model);
                }}
                className="w-full px-3 py-2 text-sm bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-md text-[var(--cd-text-primary)] focus:outline-none focus:border-[var(--cd-cyan-border)]"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-2" style={{ color: "var(--cd-text-muted)" }}>
                Provider: {selectedModel.provider}
              </p>
            </div>

            {/* Clear Chat */}
            <button
              onClick={handleClear}
              disabled={messages.length === 0}
              className="cd-btn cd-btn-ghost w-full flex items-center justify-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Clear Chat
            </button>

            {/* Tips */}
            <div className="cd-card">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--cd-text-muted)" }}>
                Tips
              </h4>
              <ul className="space-y-2 text-xs" style={{ color: "var(--cd-text-secondary)" }}>
                <li>• Try different models for best results</li>
                <li>• Press Enter to send</li>
                <li>• Shift+Enter for new line</li>
                <li>• Click message to copy</li>
              </ul>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div
              className="cd-card flex flex-col"
              style={{ height: "calc(100vh - 14rem)", minHeight: "500px", padding: 0 }}
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BrainIcon className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--cd-text-muted)" }} />
                      <h3 className="text-lg font-medium mb-2" style={{ color: "var(--cd-text-primary)" }}>
                        Start a conversation
                      </h3>
                      <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                        Ask me anything. Powered by multiple AI providers.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                      >
                        {message.role === "assistant" && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--cd-purple-muted)" }}
                          >
                            <SparklesIcon className="w-4 h-4" style={{ color: "var(--cd-purple)" }} />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 cursor-pointer group ${
                            message.role === "user"
                              ? "bg-[var(--cd-cyan-muted)] border border-[var(--cd-cyan-border)]"
                              : "bg-[var(--cd-elevated)] border border-[var(--cd-border-muted)]"
                          }`}
                          onClick={() => handleCopy(message.content)}
                          title="Click to copy"
                        >
                          <p
                            className="text-sm whitespace-pre-wrap"
                            style={{
                              color: message.role === "user" ? "var(--cd-cyan)" : "var(--cd-text-primary)"
                            }}
                          >
                            {message.content}
                          </p>
                          <div
                            className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 text-xs"
                            style={{ color: "var(--cd-text-muted)" }}
                          >
                            <CopyIcon className="w-3 h-3" />
                            Click to copy
                          </div>
                        </div>
                        {message.role === "user" && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--cd-cyan-muted)" }}
                          >
                            <UserIcon className="w-4 h-4" style={{ color: "var(--cd-cyan)" }} />
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--cd-purple-muted)" }}
                        >
                          <SparklesIcon className="w-4 h-4" style={{ color: "var(--cd-purple)" }} />
                        </div>
                        <div
                          className="rounded-lg p-3"
                          style={{ background: "var(--cd-elevated)", border: "1px solid var(--cd-border-muted)" }}
                        >
                          <div className="flex gap-1">
                            <div
                              className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: "var(--cd-text-muted)", animationDelay: "0ms" }}
                            />
                            <div
                              className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: "var(--cd-text-muted)", animationDelay: "150ms" }}
                            />
                            <div
                              className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: "var(--cd-text-muted)", animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && (
                <div className="px-6 pb-2">
                  <div className="cd-alert cd-alert-error text-xs">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-4" style={{ borderColor: "var(--cd-border-muted)" }}>
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={loading}
                    rows={1}
                    className="flex-1 px-3 py-2 text-sm bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-md text-[var(--cd-text-primary)] placeholder:text-[var(--cd-text-muted)] focus:outline-none focus:border-[var(--cd-cyan-border)] resize-none disabled:opacity-50"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="cd-btn cd-btn-primary px-4"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Notification */}
      {copyNotification && (
        <div
          className="fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm animate-fade-in"
          style={{
            background: "var(--cd-cyan)",
            color: "var(--cd-abyss)"
          }}
        >
          Copied to clipboard
        </div>
      )}
    </div>
  );
}