"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/firebase/auth-service";

type SupportItem = { site: string; models: string[] };
type Message = { role: "user" | "assistant"; content: string };

export function AIPage() {
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
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="surface p-6 md:p-8">
          <h1 className="text-2xl font-semibold md:text-3xl">AI Console</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Backed by gpt4free providers. Choose a site + model and run real chat completions.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-foreground/70">
              Site
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
              >
                {supports.map((item) => (
                  <option key={item.site} value={item.site}>
                    {item.site} ({item.models.length} models)
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium uppercase tracking-wide text-foreground/70">
              Model
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm"
              >
                {modelsForSelectedSite.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="surface flex min-h-[420px] flex-col p-4 md:p-6">
          <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 bg-white/60 p-4 text-sm text-foreground/70">
                Start a chat. Your request goes through `/api/ai/chat` to gpt4free.
              </p>
            ) : null}

            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`rounded-xl p-3 text-sm ${
                  msg.role === "user" ? "ml-auto max-w-[90%] bg-primary text-primary-foreground" : "max-w-[90%] bg-white"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-black/5 pt-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              rows={4}
              className="w-full resize-none rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground/60">{supports.length ? `${supports.length} provider sites loaded` : "Loading providers..."}</p>
              <Button type="submit" disabled={loading || !input.trim() || !uid}>
                {loading ? "Thinking..." : "Send"}
              </Button>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}
