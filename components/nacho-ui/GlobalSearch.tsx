import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

type GlobalSearchProps = React.InputHTMLAttributes<HTMLInputElement>;

export function GlobalSearch({ className, ...props }: GlobalSearchProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className={cn("relative group", className)}>
      <Search 
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-all duration-300",
          isFocused 
            ? "text-nacho-primary scale-110" 
            : "text-nacho-subtext group-hover:text-nacho-text"
        )} 
      />
      <input
        type="text"
        placeholder="Search components, tokens, or layouts..."
        className="w-full h-12 md:h-14 pl-12 pr-4 bg-nacho-card border border-nacho-border rounded-2xl text-nacho-text placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary/60 focus:bg-nacho-card-hover focus:shadow-[0_0_0_3px_rgba(168,180,208,0.1)] focus:scale-[1.01] transition-all duration-300 ease-out"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </div>
  );
}

