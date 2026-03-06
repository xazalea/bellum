"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Brain, MessageSquare, Send, Sparkles } from "lucide-react";

const aiModels = [
  { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
  { id: "claude-3", name: "Claude 3", description: "Anthropic's latest" },
  { id: "gemini", name: "Gemini", description: "Google's multimodal" },
];

export default function AIPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setMessage("");
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm here to help you with any questions!" },
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black">
      <BackgroundPaths className="fixed inset-0 opacity-30" />
      
      <div className="relative z-10 pt-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                AI Assistants
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Access powerful AI models to help with coding, writing, and analysis.
            </p>
          </div>

          {/* Model Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex gap-3 justify-center flex-wrap">
              {aiModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedModel === model.id
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlowingCard className="p-6">
              {/* Messages */}
              <div className="min-h-[300px] max-h-[400px] overflow-y-auto mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-white/40">
                    <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                    <p>Start a conversation</p>
                    <p className="text-sm">Ask anything, I'm here to help</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-white/10 text-white"
                            : "bg-white/5 text-white/80"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
                <GradientButton variant="primary" onClick={handleSend}>
                  <Send className="w-4 h-4" />
                </GradientButton>
              </div>
            </GlowingCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}