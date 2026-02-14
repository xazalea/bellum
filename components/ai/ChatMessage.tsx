import React from 'react';
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
        <div className="flex-shrink-0 w-7 h-7 border-2 border-ocean-accent/30 bg-ocean-accent/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-ocean-accent" />
        </div>
      )}

      <div className={`flex-1 max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`p-4 border-2 text-sm leading-relaxed font-mono ${
            isUser
              ? 'bg-ocean-accent/5 border-ocean-accent/20 text-ocean-primary'
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
                className="flex-shrink-0 p-1 text-ocean-muted hover:text-ocean-accent transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 border-2 border-ocean-border bg-ocean-surface flex items-center justify-center">
          <User className="w-4 h-4 text-ocean-secondary" />
        </div>
      )}
    </div>
  );
}
