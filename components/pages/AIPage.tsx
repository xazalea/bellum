"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Zap,
  AlertCircle,
  RefreshCw,
  X,
  Globe,
  Gamepad2,
  Smartphone,
  Monitor,
  Cpu,
  Copy,
  Check,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; streaming?: boolean };

const MODELS = [
  { id: "glm-4-plus", label: "GLM-4 Plus", provider: "GLM" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "GPT4Free" },
  { id: "gemini-pro", label: "Gemini Pro", provider: "WebAI" },
];

const SUGGESTED_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a short poem about gaming",
  "Help me write a Python function",
  "What are the best strategy games?",
];

// ROOT FIX: All AI calls are routed through the server-side proxy, never directly to external APIs.
// This eliminates all CORS issues since the Next.js backend makes the external calls.
async function serverChat(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: messages,
      model,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `AI request failed (${response.status})`);
  }

  const data = await response.json();
  return data.content || "I couldn't generate a response. Please try again.";
}

export function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("glm-4-plus");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: "Home", link: "/", icon: <Globe className="w-4 h-4" /> },
    { name: "Games", link: "/games", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: "Android", link: "/android", icon: <Smartphone className="w-4 h-4" /> },
    { name: "Windows", link: "/windows", icon: <Monitor className="w-4 h-4" /> },
    { name: "AI", link: "/ai", icon: <Sparkles className="w-4 h-4" /> },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    // Add thinking placeholder
    setMessages([...newMessages, { role: "assistant", content: "", streaming: true }]);

    try {
      // ROOT FIX: Route through the server-side proxy, not direct external API.
      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const responseContent = await serverChat(chatHistory, model);

      setMessages([
        ...newMessages,
        { role: "assistant", content: responseContent, streaming: false },
      ]);
    } catch (e: any) {
      setError(e?.message || "Chat failed. Please try again.");
      setMessages(newMessages); // Remove placeholder
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  async function copyMessage(content: string, idx: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background */}
      <BackgroundBeams className="opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.08),transparent_50%)]" />

      {/* Navigation */}
      <FloatingNav navItems={navItems} />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-28 md:px-6 md:py-36">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
            <Cpu className="w-3 h-3" />
            Powered by GLM-4 • GPT4Free • WebAI
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
            AI Console
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto text-sm">
            Multi-provider AI assistant with automatic failover. All requests are processed securely through our server.
          </p>
        </motion.section>

        {/* Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-950/80 border border-white/[0.08] backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            {/* Provider Status — STATIC, no external health checks */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-neutral-400">AI Online</span>
            </div>

            {/* Model Selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-xs bg-transparent border border-white/10 rounded-lg px-2 py-1 text-white outline-none cursor-pointer hover:border-white/20 transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-neutral-900">
                  {m.label} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </motion.div>

        {/* Chat Interface */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex min-h-[500px] flex-col rounded-2xl border border-white/[0.08] bg-neutral-950/50 backdrop-blur-xl"
        >
          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/[0.08] flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-purple-400/50" />
                </div>
                <p className="text-neutral-500 text-sm max-w-sm mb-6">
                  Start a conversation. All requests are routed through our secure server gateway.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/[0.08] text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={`msg-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === "user"
                        ? "bg-white/10"
                        : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                      }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-purple-400" />
                    )}
                  </div>
                  <div
                    className={`group relative rounded-2xl px-4 py-3 max-w-[85%] ${msg.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-neutral-900/80 border border-white/[0.08] text-white"
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                      {msg.streaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
                      )}
                    </p>
                    {/* Copy button for assistant messages */}
                    {msg.role === "assistant" && msg.content && !msg.streaming && (
                      <button
                        onClick={() => copyMessage(msg.content, idx)}
                        className="absolute -bottom-2 right-2 p-1 rounded-md bg-neutral-800 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-neutral-400" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}

            {loading && messages[messages.length - 1]?.streaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-neutral-900/80 border border-white/[0.08]">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-white/[0.08] p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                rows={2}
                className="flex-1 resize-none rounded-2xl border border-white/[0.08] bg-neutral-900/80 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none ring-purple-500/30 focus:ring-2 focus:border-purple-500/30 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).form?.requestSubmit();
                  }
                }}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 self-end h-12 px-4 border-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-neutral-600">
                Model: {MODELS.find((m) => m.id === model)?.label || model} • Server-side proxy
              </p>
              {error && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
            </div>
          </form>
        </motion.section>

        <p className="text-center text-xs text-neutral-600">
          Responses are generated via server-side AI gateway. No direct browser-to-API calls.
        </p>
      </main>
    </div>
  );
}