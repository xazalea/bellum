import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

type GlobalSearchProps = React.InputHTMLAttributes<HTMLInputElement>;

export function GlobalSearch({ className, ...props }: GlobalSearchProps) {
  return (
    <div className={cn("relative group", className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-nacho-subtext group-focus-within:text-nacho-primary transition-colors duration-200" />
      <input
        type="text"
        placeholder="Search components, tokens, or layouts..."
        className="w-full h-12 md:h-14 pl-12 pr-4 bg-nacho-card border border-nacho-border rounded-2xl text-nacho-text placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary/50 focus:bg-nacho-card-hover focus:shadow-glow transition-all duration-200"
        {...props}
      />
    </div>
  );
}

