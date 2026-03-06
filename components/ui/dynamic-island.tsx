"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Gamepad2,
  Smartphone,
  Monitor,
  Cpu,
  Brain,
  Database,
  Cloud,
  Server,
  User,
} from "lucide-react";

type IslandSize = "default" | "compact" | "large" | "tall" | "medium" | "ultra" | "massive";

interface DynamicIslandContextType {
  size: IslandSize;
  setSize: (size: IslandSize) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const DynamicIslandContext = createContext<DynamicIslandContextType | null>(null);

export function useDynamicIsland() {
  const context = useContext(DynamicIslandContext);
  if (!context) {
    throw new Error("useDynamicIsland must be used within a DynamicIslandProvider");
  }
  return context;
}

interface DynamicIslandProviderProps {
  children: React.ReactNode;
  initialSize?: IslandSize;
}

export function DynamicIslandProvider({
  children,
  initialSize = "default",
}: DynamicIslandProviderProps) {
  const [size, setSize] = useState<IslandSize>(initialSize);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <DynamicIslandContext.Provider
      value={{ size, setSize, isExpanded, setIsExpanded }}
    >
      {children}
    </DynamicIslandContext.Provider>
  );
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/android", label: "Android", icon: Smartphone },
  { href: "/windows", label: "Windows", icon: Monitor },
  { href: "/virtual-machines", label: "VMs", icon: Cpu },
  { href: "/ai", label: "AI", icon: Brain },
  { href: "/library", label: "Library", icon: Database },
  { href: "/storage", label: "Storage", icon: Cloud },
  { href: "/cluster", label: "Cluster", icon: Server },
  { href: "/account", label: "Account", icon: User },
];

interface DynamicIslandProps {
  className?: string;
}

export function DynamicIsland({ className }: DynamicIslandProps) {
  const { isExpanded, setIsExpanded } = useDynamicIsland();
  const pathname = usePathname();
  const islandRef = useRef<HTMLDivElement>(null);

  // Close island when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        islandRef.current &&
        !islandRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsExpanded]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [setIsExpanded]);

  const currentItem = navItems.find((item) => item.href === pathname);
  const CurrentIcon = currentItem?.icon || Home;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50" ref={islandRef}>
      <motion.div
        className={cn(
          "bg-black/90 backdrop-blur-xl rounded-full cursor-pointer overflow-hidden",
          "border border-white/10 shadow-2xl shadow-black/50",
          className
        )}
        initial={false}
        animate={{
          width: isExpanded ? 420 : 180,
          height: isExpanded ? "auto" : 44,
          borderRadius: isExpanded ? 24 : 22,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Compact state */}
        <AnimatePresence mode="wait">
          {!isExpanded && (
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-11 px-4 gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white/90 text-sm font-medium">
                {currentItem?.label || "Home"}
              </span>
              <CurrentIcon className="w-4 h-4 text-white/60 ml-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded state */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/90 text-sm font-medium">
                  Navigation
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="text-white/60 text-xs">×</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsExpanded(false)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default DynamicIsland;