"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { MinimalNavIsland } from "@/components/ui/dynamic-island";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/firebase/auth-service";
import { Sparkles, Send, Loader2, Bot, User, Zap } from "lucide-react";

type SupportItem = { site: string; models: string[] };
type Message = { role: "user" | "assistant"; content: string };

export function AIPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string>("");
  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [site, setSite] = useState("auto");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void boot();
  }, []);

  const modelsForSelectedSite = useMemo(() => {
    const match = supports.find((item) => item.site === site);
    return match?.models || [];
  }, [site, supports]);

  useEffect(() => {
    if (modelsForSelectedSite.length && !modelsForSelectedSite.includes(model)) {
      setModel(modelsForSelectedSite[0]!);
    }
  }, [model, modelsForSelectedSite]);

  async function boot() {
    try {
      const identity = await authService.ensureIdentity();
      setUid(identity.uid);

      const res = await fetch("/api/ai/supports", {
        headers: { "X-Challenger-UserId": identity.uid },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => [])) as SupportItem[];
      const items = Array.isArray(json) ? json : [];
      setSupports(items);
      if (items.length) {
        setSite(items[0]!.site);
        setModel(items[0]!.models[0] || "gpt-3.5-turbo");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to initialize AI console");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !uid || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Challenger-UserId": uid,
        },
        body: JSON.stringify({ prompt: nextMessages, model, site }),
      });

      const json = (await res.json().catch(() => ({}))) as { content?: string; error?: string };
      if (!res.ok) {
        throw new Error(json.error || `Chat failed (${res.status})`);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: json.content || "" }]);
    } catch (e: any) {
      setError(e?.message || "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Effect */}
      <BackgroundRippleEffect />
      
      {/* Navigation */}
      <MinimalNavIsland currentPath="/ai" onNavigate={(path) => router.push(path)} />
      
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-24 md:px-6 md:py-32">
        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 mb-6">
            <Sparkles className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            AI Console
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Powered by gpt4free providers. Choose a site + model and run real chat completions.
          </p>
        </motion.section>

        {/* Model Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="surface-glow p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-400 block mb-2">
                Provider Site
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none ring-white/20 focus:ring-2 transition-all"
              >
                {supports.map((item) => (
                  <option key={item.site} value={item.site} className="bg-neutral-900">
                    {item.site} ({item.models.length} models)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-400 block mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 text-sm text-white outline-none ring-white/20 focus:ring-2 transition-all"
              >
                {modelsForSelectedSite.map((m) => (
                  <option key={m} value={m} className="bg-neutral-900">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.section>

        {/* Chat Interface */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="surface-glow flex min-h-[500px] flex-col"
        >
          {/* Messages */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-white/10 flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-amber-400/50" />
                </div>
                <p className="text-neutral-500 text-sm max-w-sm">
                  Start a conversation. Your requests go through `/api/ai/chat` to gpt4free providers.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={`${msg.role}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.role === "user" 
                      ? "bg-white/10" 
                      : "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                  }`}>
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-white text-black"
                      : "bg-neutral-800/80 border border-white/10 text-white"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))
            )}
            
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-amber-400" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-neutral-800/80 border border-white/10">
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none ring-white/20 focus:ring-2 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).form?.requestSubmit();
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={loading || !input.trim() || !uid}
                className="bg-white text-black hover:bg-neutral-200 self-end h-12"
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
                {supports.length ? `${supports.length} provider sites loaded` : "Loading providers..."}
              </p>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </form>
        </motion.section>
      </main>
    </div>
  );
}