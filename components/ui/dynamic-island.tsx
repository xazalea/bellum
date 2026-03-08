"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Gamepad2, Smartphone, Monitor, X, Menu } from "lucide-react";

// Size presets for the Dynamic Island
export type IslandSize =
  | "reset"
  | "empty"
  | "default"
  | "compact"
  | "compactLong"
  | "large"
  | "long"
  | "minimalLeading"
  | "minimalTrailing"
  | "compactMedium"
  | "medium"
  | "tall"
  | "ultra"
  | "massive";

interface DynamicIslandSizePresets {
  [key: string]: {
    width: string;
    height: string;
  };
}

const sizePresets: DynamicIslandSizePresets = {
  reset: { width: "0px", height: "0px" },
  empty: { width: "0px", height: "0px" },
  default: { width: "126px", height: "37px" },
  compact: { width: "80px", height: "37px" },
  compactLong: { width: "150px", height: "37px" },
  large: { width: "250px", height: "80px" },
  long: { width: "350px", height: "45px" },
  minimalLeading: { width: "50px", height: "37px" },
  minimalTrailing: { width: "50px", height: "37px" },
  compactMedium: { width: "180px", height: "37px" },
  medium: { width: "200px", height: "50px" },
  tall: { width: "126px", height: "100px" },
  ultra: { width: "350px", height: "150px" },
  massive: { width: "400px", height: "200px" },
};

// Context for Dynamic Island state
interface DynamicIslandContextType {
  size: IslandSize;
  setSize: (size: IslandSize) => void;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
}

const DynamicIslandContext = React.createContext<DynamicIslandContextType | null>(null);

export function useDynamicIslandSize() {
  const context = React.useContext(DynamicIslandContext);
  if (!context) {
    throw new Error("useDynamicIslandSize must be used within a DynamicIslandProvider");
  }
  return context;
}

export function DynamicIslandProvider({
  children,
  initialSize = "default",
  initialAnimation = false,
}: {
  children: React.ReactNode;
  initialSize?: IslandSize;
  initialAnimation?: boolean;
}) {
  const [size, setSize] = React.useState<IslandSize>(initialSize);
  const [isAnimating, setIsAnimating] = React.useState(initialAnimation);

  return (
    <DynamicIslandContext.Provider
      value={{ size, setSize, isAnimating, setIsAnimating }}
    >
      {children}
    </DynamicIslandContext.Provider>
  );
}

// Main Dynamic Island Component
interface DynamicIslandProps {
  children?: React.ReactNode;
  className?: string;
  size?: IslandSize;
}

export function DynamicIsland({ children, className, size = "default" }: DynamicIslandProps) {
  const currentSize = sizePresets[size] || sizePresets.default;

  return (
    <motion.div
      className={cn(
        "dynamic-island relative overflow-hidden",
        className
      )}
      initial={false}
      animate={{
        width: currentSize.width,
        height: currentSize.height,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
    >
      <AnimatePresence mode="wait">
        {children && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Navigation Island Component
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: <Home className="w-4 h-4" />, href: "/" },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-4 h-4" />, href: "/games" },
  { id: "android", label: "Android", icon: <Smartphone className="w-4 h-4" />, href: "/android" },
  { id: "windows", label: "Windows", icon: <Monitor className="w-4 h-4" />, href: "/windows" },
];

interface NavigationIslandProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function NavigationIsland({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
    >
      <motion.div
        className="dynamic-island relative overflow-hidden cursor-pointer"
        initial={false}
        animate={{
          width: isExpanded ? "320px" : isHovered ? "200px" : "126px",
          height: isExpanded ? "auto" : "44px",
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Collapsed state - show current page icon */}
        <AnimatePresence mode="wait">
          {!isExpanded && (
            <motion.div
              key="collapsed"
              className="absolute inset-0 flex items-center justify-center gap-2 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {navItems.find((item) => item.href === currentPath)?.icon}
              {isHovered && (
                <motion.span
                  className="text-white text-sm font-medium"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                >
                  {navItems.find((item) => item.href === currentPath)?.label}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded state - show all nav items */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="expanded"
              className="p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-white/60 text-xs font-medium">Navigation</span>
                <button
                  className="text-white/60 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                      currentPath === item.href
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(item.href);
                      setIsExpanded(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Minimal navigation island for inline use
export function MinimalNavIsland({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  return (
    <motion.div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        className
      )}
    >
      <motion.div
        className="dynamic-island flex items-center gap-1 px-2 py-1"
        initial={false}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "p-2 rounded-full transition-colors",
              currentPath === item.href
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white/80"
            )}
            onClick={() => onNavigate(item.href)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {item.icon}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

export { navItems };