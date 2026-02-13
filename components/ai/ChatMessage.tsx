import React from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onCopy?: () => void;
}

export function ChatMessage({ role, content, onCopy }: ChatMessageProps) {
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    if (onCopy) onCopy();
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ocean-accent/15 flex items-center justify-center">
          <Bot className="w-4 h-4 text-ocean-accent" />
        </div>
      )}

      <div className={`flex-1 max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`p-4 rounded-md border text-sm leading-relaxed ${
            isUser
              ? 'bg-ocean-accent/10 border-ocean-accent/15 text-ocean-primary'
              : 'bg-ocean-card border-ocean-border text-ocean-text'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 whitespace-pre-wrap break-words">
              {content}
            </div>
            {!isUser && (
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1 text-ocean-muted hover:text-ocean-secondary transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ocean-surface border border-ocean-border flex items-center justify-center">
          <User className="w-4 h-4 text-ocean-secondary" />
        </div>
      )}
    </div>
  );
}
