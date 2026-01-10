import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children,
  loading = false,
  disabled,
  onClick,
  ...props 
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    
    // Ripple effect
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'ripple';
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    onClick?.(e);
  };

  const baseStyles = "relative overflow-hidden inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-full disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-nacho-primary text-nacho-bg hover:brightness-110 hover:shadow-[0_0_20px_rgba(168,180,208,0.4)] hover:-translate-y-0.5",
    secondary: "bg-transparent border border-nacho-border text-nacho-text hover:bg-nacho-card-hover hover:border-nacho-border-strong hover:shadow-lg",
    ghost: "bg-transparent text-nacho-text hover:bg-white/5",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2.5",
  };

  const pressedStyles = isPressed ? "scale-95" : "";

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], pressedStyles, className)}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading</span>
        </>
      ) : children}
      
      <style jsx>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}

