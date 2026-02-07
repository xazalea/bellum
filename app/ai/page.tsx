'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { ModelSelector } from '@/components/ai/ModelSelector';
import { Send, Trash2, Sparkles } from 'lucide-react';
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

    // Create abort controller for this request
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
              // Ignore JSON parse errors for non-JSON lines
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-nacho-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Chat
            </h1>
          </div>
          <p className="text-nacho-text-secondary text-lg">
            Access thousands of AI models for free
          </p>
        </div>

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
                className="w-full nacho-btn flex items-center justify-center gap-2"
                disabled={messages.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </Button>
            </Card>

            <Card className="p-4 text-xs text-nacho-text-secondary space-y-2">
              <p className="font-semibold text-nacho-text">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Try different providers for best results</li>
                <li>Some providers may be slower than others</li>
                <li>Press Enter to send, Shift+Enter for new line</li>
              </ul>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[calc(100vh-12rem)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-nacho-text mb-2">
                          Start a conversation
                        </h3>
                        <p className="text-nacho-text-secondary">
                          Ask me anything! I&apos;m powered by multiple AI providers.
                        </p>
                      </div>
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
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <Card className="p-4 bg-nacho-card">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </Card>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-nacho-border p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-lg bg-nacho-bg border border-nacho-border text-nacho-text focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="nacho-btn px-6 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Copy Notification */}
        {copyNotification && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            Copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
}
