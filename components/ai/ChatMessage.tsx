import React from 'react';
import { Card } from '@/components/ui/Card';
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <Card
          className={`p-4 ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
              : 'bg-nacho-card'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {content}
            </div>
            {!isUser && (
              <Button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 h-auto bg-transparent hover:bg-nacho-card-hover"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
