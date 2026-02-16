'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { ModelSelector } from '@/components/ai/ModelSelector';
import { Send, Trash2 } from 'lucide-react';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState('auto');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [copyNotification, setCopyNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = () => {
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2000);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const uid = await getDeviceFingerprintId();
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nacho-userid': uid,
        },
        body: JSON.stringify({
          prompt: [...messages, userMessage],
          model: selectedModel,
          site: selectedSite,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let assistantMessage = '';
      let messageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content && data.content !== 'done') {
                assistantMessage += data.content;

                if (!messageAdded) {
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: assistantMessage },
                  ]);
                  messageAdded = true;
                } else {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
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
              if (line.includes('error')) {
                console.error('Stream error:', line);
              }
            }
          }
        }
      }

      if (!messageAdded && assistantMessage) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantMessage },
        ]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get response'}`,
          },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-ocean-border pb-6">
          <div className="space-y-2">
            <h1 className="font-pixel text-lg text-ocean-accent retro-glow">🧠 AI CHAT</h1>
            <p className="font-mono text-sm text-ocean-secondary">Access thousands of AI models for free</p>
          </div>
          <div className="flex items-center gap-2 font-pixel text-[8px] text-ocean-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MULTI-PROVIDER</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <ModelSelector
              selectedSite={selectedSite}
              selectedModel={selectedModel}
              onSiteChange={setSelectedSite}
              onModelChange={setSelectedModel}
            />

            <Card className="p-4">
              <Button
                onClick={handleClear}
                className="w-full ocean-btn flex items-center justify-center gap-2"
                disabled={messages.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Chat
              </Button>
            </Card>

            <div className="p-4 text-xs text-ocean-muted space-y-1.5">
              <p className="font-medium text-ocean-secondary text-[11px] uppercase tracking-wider">Tips</p>
              <ul className="space-y-1">
                <li>Try different providers for best results</li>
                <li>Press Enter to send, Shift+Enter for new line</li>
              </ul>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[calc(100vh-14rem)] p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <h3 className="text-base font-medium text-ocean-primary">
                        Start a conversation
                      </h3>
                      <p className="text-sm text-ocean-muted">
                        Ask me anything. Powered by multiple AI providers.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        role={message.role}
                        content={message.content}
                        onCopy={handleCopy}
                      />
                    ))}
                    {loading && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ocean-accent/15 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-ocean-accent animate-pulse" />
                        </div>
                        <div className="p-3 rounded-md bg-ocean-card border border-ocean-border">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-ocean-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-ocean-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-ocean-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-ocean-border p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    variant="primary"
                    className="px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {copyNotification && (
          <div className="fixed bottom-4 right-4 bg-ocean-accent text-ocean-bg px-4 py-2 rounded-md text-sm animate-fade-in">
            Copied to clipboard
          </div>
        )}
      </div>
    </main>
  );
}
