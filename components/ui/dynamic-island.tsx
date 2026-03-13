"use client";

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useWillChange } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bell,
  CloudLightning,
  Music2,
  Pause,
  Phone,
  Play,
  SkipBack,
  SkipForward,
  Thermometer,
  Timer as TimerIcon,
  Home,
  Gamepad2,
  Smartphone,
  Monitor,
  X,
} from "lucide-react";

const stiffness = 400;
const damping = 30;
const MIN_WIDTH = 691;
const MAX_HEIGHT_MOBILE_ULTRA = 400;
const MAX_HEIGHT_MOBILE_MASSIVE = 700;

const min = (a: number, b: number) => (a < b ? a : b);

export type SizePresets =
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

const SIZE_PRESETS_CONST = {
  RESET: "reset",
  EMPTY: "empty",
  DEFAULT: "default",
  COMPACT: "compact",
  COMPACT_LONG: "compactLong",
  LARGE: "large",
  LONG: "long",
  MINIMAL_LEADING: "minimalLeading",
  MINIMAL_TRAILING: "minimalTrailing",
  COMPACT_MEDIUM: "compactMedium",
  MEDIUM: "medium",
  TALL: "tall",
  ULTRA: "ultra",
  MASSIVE: "massive",
} as const;

type Preset = {
  width: number;
  height?: number;
  aspectRatio: number;
  borderRadius: number;
};

const DynamicIslandSizePresets: Record<SizePresets, Preset> = {
  [SIZE_PRESETS_CONST.RESET]: {
    width: 150,
    aspectRatio: 1,
    borderRadius: 20,
  },
  [SIZE_PRESETS_CONST.EMPTY]: {
    width: 0,
    aspectRatio: 0,
    borderRadius: 0,
  },
  [SIZE_PRESETS_CONST.DEFAULT]: {
    width: 150,
    aspectRatio: 44 / 150,
    borderRadius: 46,
  },
  [SIZE_PRESETS_CONST.MINIMAL_LEADING]: {
    width: 52.33,
    aspectRatio: 44 / 52.33,
    borderRadius: 22,
  },
  [SIZE_PRESETS_CONST.MINIMAL_TRAILING]: {
    width: 52.33,
    aspectRatio: 44 / 52.33,
    borderRadius: 22,
  },
  [SIZE_PRESETS_CONST.COMPACT]: {
    width: 235,
    aspectRatio: 44 / 235,
    borderRadius: 46,
  },
  [SIZE_PRESETS_CONST.COMPACT_LONG]: {
    width: 300,
    aspectRatio: 44 / 235,
    borderRadius: 46,
  },
  [SIZE_PRESETS_CONST.COMPACT_MEDIUM]: {
    width: 351,
    aspectRatio: 64 / 371,
    borderRadius: 44,
  },
  [SIZE_PRESETS_CONST.LONG]: {
    width: 371,
    aspectRatio: 84 / 371,
    borderRadius: 42,
  },
  [SIZE_PRESETS_CONST.MEDIUM]: {
    width: 371,
    aspectRatio: 210 / 371,
    borderRadius: 22,
  },
  [SIZE_PRESETS_CONST.LARGE]: {
    width: 371,
    aspectRatio: 84 / 371,
    borderRadius: 42,
  },
  [SIZE_PRESETS_CONST.TALL]: {
    width: 371,
    aspectRatio: 210 / 371,
    borderRadius: 42,
  },
  [SIZE_PRESETS_CONST.ULTRA]: {
    width: 630,
    aspectRatio: 630 / 800,
    borderRadius: 42,
  },
  [SIZE_PRESETS_CONST.MASSIVE]: {
    width: 891,
    height: 1900,
    aspectRatio: 891 / 891,
    borderRadius: 42,
  },
};

type BlobStateType = {
  size: SizePresets;
  previousSize: SizePresets | undefined;
  animationQueue: Array<{ size: SizePresets; delay: number }>;
  isAnimating: boolean;
};

type BlobAction =
  | { type: "SET_SIZE"; newSize: SizePresets }
  | { type: "INITIALIZE"; firstState: SizePresets }
  | {
      type: "SCHEDULE_ANIMATION";
      animationSteps: Array<{ size: SizePresets; delay: number }>;
    }
  | { type: "ANIMATION_END" };

type BlobContextType = {
  state: BlobStateType;
  dispatch: React.Dispatch<BlobAction>;
  setSize: (size: SizePresets) => void;
  scheduleAnimation: (
    animationSteps: Array<{ size: SizePresets; delay: number }>
  ) => void;
  presets: Record<SizePresets, Preset>;
};

const BlobContext = createContext<BlobContextType | undefined>(undefined);

const blobReducer = (
  state: BlobStateType,
  action: BlobAction
): BlobStateType => {
  switch (action.type) {
    case "SET_SIZE":
      return {
        ...state,
        size: action.newSize,
        previousSize: state.size,
        isAnimating: false,
      };
    case "SCHEDULE_ANIMATION":
      return {
        ...state,
        animationQueue: action.animationSteps,
        isAnimating: action.animationSteps.length > 0,
      };
    case "INITIALIZE":
      return {
        ...state,
        size: action.firstState,
        previousSize: SIZE_PRESETS_CONST.EMPTY,
        isAnimating: false,
      };
    case "ANIMATION_END":
      return {
        ...state,
        isAnimating: false,
      };
    default:
      return state;
  }
};

interface DynamicIslandProviderProps {
  children: React.ReactNode;
  initialSize?: SizePresets;
  initialAnimation?: Array<{ size: SizePresets; delay: number }>;
}

export const DynamicIslandProvider: React.FC<DynamicIslandProviderProps> = ({
  children,
  initialSize = SIZE_PRESETS_CONST.DEFAULT,
  initialAnimation = [],
}) => {
  const initialState: BlobStateType = {
    size: initialSize,
    previousSize: SIZE_PRESETS_CONST.EMPTY,
    animationQueue: initialAnimation,
    isAnimating: initialAnimation.length > 0,
  };

  const [state, dispatch] = useReducer(blobReducer, initialState);

  useEffect(() => {
    const processQueue = async () => {
      for (const step of state.animationQueue) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        dispatch({ type: "SET_SIZE", newSize: step.size });
      }
      dispatch({ type: "ANIMATION_END" });
    };

    if (state.animationQueue.length > 0) {
      processQueue();
    }
  }, [state.animationQueue]);

  const setSize = useCallback(
    (newSize: SizePresets) => {
      if (state.previousSize !== newSize && newSize !== state.size) {
        dispatch({ type: "SET_SIZE", newSize });
      }
    },
    [state.previousSize, state.size, dispatch]
  );

  const scheduleAnimation = useCallback(
    (animationSteps: Array<{ size: SizePresets; delay: number }>) => {
      dispatch({ type: "SCHEDULE_ANIMATION", animationSteps });
    },
    [dispatch]
  );

  const contextValue = {
    state,
    dispatch,
    setSize,
    scheduleAnimation,
    presets: DynamicIslandSizePresets,
  };

  return (
    <BlobContext.Provider value={contextValue}>{children}</BlobContext.Provider>
  );
};
DynamicIslandProvider.displayName = "DynamicIslandProvider";

export const useDynamicIslandSize = () => {
  const context = useContext(BlobContext);
  if (!context) {
    throw new Error(
      "useDynamicIslandSize must be used within a DynamicIslandProvider"
    );
  }
  return context;
};

export const useScheduledAnimations = (
  animations: Array<{ size: SizePresets; delay: number }>
) => {
  const { scheduleAnimation } = useDynamicIslandSize();
  const animationsRef = useRef(animations);

  useEffect(() => {
    scheduleAnimation(animationsRef.current);
  }, [scheduleAnimation]);
};

const DynamicIslandContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="z-10 flex h-full w-full items-end justify-center bg-transparent">
      {children}
    </div>
  );
};
DynamicIslandContainer.displayName = "DynamicIslandContainer";

export const DynamicIsland = ({
  children,
  id,
  ...props
}: {
  children: ReactNode;
  id: string;
}) => {
  const willChange = useWillChange();
  const [screenSize, setScreenSize] = useState("desktop");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 640) {
        setScreenSize("mobile");
      } else if (window.innerWidth <= 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DynamicIslandContainer>
      <DynamicIslandContent
        id={id}
        willChange={willChange}
        screenSize={screenSize}
        {...props}
      >
        {children}
      </DynamicIslandContent>
    </DynamicIslandContainer>
  );
};
DynamicIsland.displayName = "DynamicIsland";

const calculateDimensions = (
  size: SizePresets,
  screenSize: string,
  currentSize: Preset
): { width: string; height: number } => {
  const isMassiveOnMobile = size === "massive" && screenSize === "mobile";
  const isUltraOnMobile = size === "ultra" && screenSize === "mobile";

  if (isMassiveOnMobile) {
    return { width: "350px", height: MAX_HEIGHT_MOBILE_MASSIVE };
  }

  if (isUltraOnMobile) {
    return { width: "350px", height: MAX_HEIGHT_MOBILE_ULTRA };
  }

  const width = min(currentSize.width, MIN_WIDTH);
  return { width: `${width}px`, height: currentSize.aspectRatio * width };
};

const DynamicIslandContent = ({
  children,
  id,
  willChange,
  screenSize,
  ...props
}: {
  children: React.ReactNode;
  id: string;
  willChange: any;
  screenSize: string;
  [key: string]: any;
}) => {
  const { state, presets } = useDynamicIslandSize();
  const currentSize = presets[state.size];

  const dimensions = calculateDimensions(state.size, screenSize, currentSize);

  return (
    <motion.div
      id={id}
      className="mx-auto h-0 w-0 items-center justify-center border border-white/10 bg-black text-center text-white transition duration-300 ease-in-out focus-within:bg-neutral-900 hover:shadow-md"
      animate={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: currentSize.borderRadius,
        transition: {
          type: "spring",
          stiffness,
          damping,
        },
        clipPath: `none`,
        transitionEnd: {
          clipPath: `url(#squircle-${state.size})`,
        },
      }}
      style={{ willChange }}
      {...props}
    >
      <AnimatePresence>{children}</AnimatePresence>
    </motion.div>
  );
};
DynamicIslandContent.displayName = "DynamicIslandContent";

type DynamicContainerProps = {
  className?: string;
  children?: React.ReactNode;
};

export const DynamicContainer = ({ className, children }: DynamicContainerProps) => {
  const willChange = useWillChange();
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;

  const isSizeChanged = size !== previousSize;

  const initialState = {
    opacity: size === previousSize ? 1 : 0,
    scale: size === previousSize ? 1 : 0.9,
    y: size === previousSize ? 0 : 5,
  };

  const animateState = {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness,
      damping,
      duration: isSizeChanged ? 0.5 : 0.8,
    },
  };

  return (
    <motion.div
      initial={initialState}
      animate={animateState}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95, y: 20 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
DynamicContainer.displayName = "DynamicContainer";

type DynamicChildrenProps = {
  className?: string;
  children?: React.ReactNode;
};

export const DynamicDiv = ({ className, children }: DynamicChildrenProps) => {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.div
      initial={{
        opacity: size === previousSize ? 1 : 0,
        scale: size === previousSize ? 1 : 0.9,
      }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: {
          type: "spring",
          stiffness,
          damping,
        },
      }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
DynamicDiv.displayName = "DynamicDiv";

type MotionProps = {
  className: string;
  children: React.ReactNode;
};

export const DynamicTitle = ({ className, children }: MotionProps) => {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.h3
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.h3>
  );
};
DynamicTitle.displayName = "DynamicTitle";

export const DynamicDescription = ({ className, children }: MotionProps) => {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.p>
  );
};
DynamicDescription.displayName = "DynamicDescription";

export { SIZE_PRESETS_CONST as SIZE_PRESETS };

// Animation variants for the dynamic island
const ANIMATION_VARIANTS = {
  "ring-idle": { scale: 0.9, scaleX: 0.9, bounce: 0.5 },
  "timer-ring": { scale: 0.7, y: -7.5, bounce: 0.35 },
  "ring-timer": { scale: 1.4, y: 7.5, bounce: 0.35 },
  "timer-idle": { scale: 0.7, y: -7.5, bounce: 0.3 },
  "idle-timer": { scale: 1.2, y: 5, bounce: 0.3 },
  "idle-ring": { scale: 1.1, y: 3, bounce: 0.5 },
} as const;

const BOUNCE_VARIANTS = {
  idle: 0.5,
  "ring-idle": 0.5,
  "timer-ring": 0.35,
  "ring-timer": 0.35,
  "timer-idle": 0.3,
  "idle-timer": 0.3,
  "idle-ring": 0.5,
} as const;

// Idle Component with Weather
const DefaultIdle = () => {
  const [showTemp, setShowTemp] = useState(false);

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2"
      onHoverStart={() => setShowTemp(true)}
      onHoverEnd={() => setShowTemp(false)}
      layout
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="storm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="text-white"
        >
          <CloudLightning className="h-5 w-5" />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showTemp && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1 overflow-hidden text-white"
          >
            <Thermometer className="h-3 w-3" />
            <span className="pointer-events-none text-xs whitespace-nowrap">
              12°C
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Ring Component
const DefaultRing = () => {
  return (
    <div className="flex w-64 items-center gap-3 overflow-hidden px-4 py-2 text-white">
      <Phone className="h-5 w-5 text-green-500" />
      <div className="flex-1">
        <p className="pointer-events-none text-sm font-medium">
          Incoming Call
        </p>
        <p className="pointer-events-none text-xs opacity-70">
          Guillermo Rauch
        </p>
      </div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
    </div>
  );
};

// Timer Component
const DefaultTimer = () => {
  const [time, setTime] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex w-64 items-center gap-3 overflow-hidden px-4 py-2 text-white">
      <TimerIcon className="h-5 w-5 text-amber-500" />
      <div className="flex-1">
        <p className="pointer-events-none text-sm font-medium">
          {time}s remaining
        </p>
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full bg-amber-500"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: time, ease: "linear" }}
        />
      </div>
    </div>
  );
};

// Notification Component
const Notification = () => (
  <div className="flex w-64 items-center gap-3 overflow-hidden px-4 py-2 text-white">
    <Bell className="h-5 w-5 text-yellow-400" />
    <div className="flex-1">
      <p className="pointer-events-none text-sm font-medium">
        New Message
      </p>
      <p className="pointer-events-none text-xs opacity-70">
        You have a new notification!
      </p>
    </div>
    <span className="rounded-full bg-yellow-400/40 px-2 py-0.5 text-xs text-yellow-500">
      1
    </span>
  </div>
);

// Music Player Component
const MusicPlayer = () => {
  const [playing, setPlaying] = useState(true);
  return (
    <div className="flex w-72 items-center gap-3 overflow-hidden px-4 py-2 text-white">
      <Music2 className="h-5 w-5 text-pink-500" />
      <div className="min-w-0 flex-1">
        <p className="pointer-events-none truncate text-sm font-medium">
          Lofi Chill Beats
        </p>
        <p className="pointer-events-none truncate text-xs opacity-70">
          DJ Smooth
        </p>
      </div>
      <button
        onClick={() => setPlaying(false)}
        className="rounded-full p-1 hover:bg-white/30"
      >
        <SkipBack className="h-4 w-4" />
      </button>
      <button
        onClick={() => setPlaying((p) => !p)}
        className="rounded-full p-1 hover:bg-white/30"
      >
        {playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={() => setPlaying(true)}
        className="rounded-full p-1 hover:bg-white/30"
      >
        <SkipForward className="h-4 w-4" />
      </button>
    </div>
  );
};

type View = "idle" | "ring" | "timer" | "notification" | "music";

export interface DynamicIslandDemoProps {
  view?: View;
  onViewChange?: (view: View) => void;
  idleContent?: ReactNode;
  ringContent?: ReactNode;
  timerContent?: ReactNode;
  className?: string;
}

export const DynamicIslandDemo = ({
  view: controlledView,
  onViewChange,
  idleContent,
  ringContent,
  timerContent,
  className = "",
}: DynamicIslandDemoProps) => {
  const [internalView, setInternalView] = useState<View>("idle");
  const [variantKey, setVariantKey] = useState<string>("idle");

  const view = controlledView ?? internalView;

  const content = (() => {
    switch (view) {
      case "ring":
        return ringContent ?? <DefaultRing />;
      case "timer":
        return timerContent ?? <DefaultTimer />;
      case "notification":
        return <Notification />;
      case "music":
        return <MusicPlayer />;
      default:
        return idleContent ?? <DefaultIdle />;
    }
  })();

  const handleViewChange = (newView: View) => {
    if (view === newView) return;
    setVariantKey(`${view}-${newView}`);
    if (onViewChange) onViewChange(newView);
    else setInternalView(newView);
  };

  return (
    <div className={cn("h-[200px]", className)}>
      <div className="relative flex h-full w-full flex-col justify-center">
        <motion.div
          layout
          transition={{
            type: "spring",
            bounce:
              BOUNCE_VARIANTS[variantKey as keyof typeof BOUNCE_VARIANTS] ??
              0.5,
          }}
          style={{ borderRadius: 32 }}
          className="mx-auto w-fit min-w-[100px] overflow-hidden rounded-full bg-black"
        >
          <motion.div
            transition={{
              type: "spring",
              bounce:
                BOUNCE_VARIANTS[variantKey as keyof typeof BOUNCE_VARIANTS] ??
                0.5,
            }}
            initial={{
              scale: 0.9,
              opacity: 0,
              filter: "blur(5px)",
              originX: 0.5,
              originY: 0.5,
            }}
            animate={{
              scale: 1,
              opacity: 1,
              filter: "blur(0px)",
              originX: 0.5,
              originY: 0.5,
              transition: { delay: 0.05 },
            }}
            key={view}
          >
            {content}
          </motion.div>
        </motion.div>

        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 justify-center gap-1 rounded-full border border-white/10 bg-black/80 p-1 backdrop-blur-sm">
          {[
            { key: "idle", icon: <CloudLightning className="size-3" /> },
            { key: "ring", icon: <Phone className="size-3" /> },
            { key: "timer", icon: <TimerIcon className="size-3" /> },
            { key: "notification", icon: <Bell className="size-3" /> },
            { key: "music", icon: <Music2 className="size-3" /> },
          ].map(({ key, icon }) => (
            <button
              type="button"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors px-2"
              onClick={() => {
                if (view !== key) {
                  setVariantKey(`${view}-${key}`);
                  handleViewChange(key as View);
                }
              }}
              key={key}
              aria-label={key}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Navigation Island for the app
const navItems = [
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.nav
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <motion.div
        className="relative overflow-hidden cursor-pointer border transition-all duration-[var(--duration-normal)]"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur-lg))",
          WebkitBackdropFilter: "blur(var(--glass-blur-lg))",
          borderColor: isHovered ? "var(--glass-border-hover)" : "var(--glass-border)",
          boxShadow: isHovered ? "var(--shadow-glow-sm)" : "var(--shadow-lg)",
        }}
        initial={false}
        animate={{
          width: isExpanded ? "320px" : isHovered ? "200px" : "126px",
          height: isExpanded ? "auto" : "44px",
          borderRadius: isExpanded ? 16 : 22,
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
    </motion.nav>
  );
}
export function MinimalNavIsland({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  return (
    <motion.div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)]",
        className
      )}
    >
      <motion.div
        className="flex items-center gap-1 px-2 py-1 border rounded-full transition-all duration-[var(--duration-normal)]"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur-lg))",
          WebkitBackdropFilter: "blur(var(--glass-blur-lg))",
          borderColor: "var(--glass-border)",
        }}
        initial={false}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
              currentPath === item.href
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white/80 hover:bg-white/10"
            )}
            onClick={() => onNavigate(item.href)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={item.label}
            aria-current={currentPath === item.href ? "page" : undefined}
          >
            {item.icon}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Mobile Bottom Navigation Bar
export function MobileBottomNav({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  return (
    <motion.nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[var(--z-fixed)] md:hidden",
        className
      )}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div
        className="flex items-center justify-around py-2 px-4 border-t transition-all duration-[var(--duration-normal)]"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur-lg))",
          WebkitBackdropFilter: "blur(var(--glass-blur-lg))",
          borderColor: "var(--glass-border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-colors min-h-[44px] min-w-[44px]",
              currentPath === item.href
                ? "text-[var(--color-primary)]"
                : "text-white/50 hover:text-white/80"
            )}
            onClick={() => onNavigate(item.href)}
            whileTap={{ scale: 0.9 }}
            aria-label={item.label}
            aria-current={currentPath === item.href ? "page" : undefined}
          >
            <motion.div
              animate={{ scale: currentPath === item.href ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-[10px] font-medium">{item.label}</span>
            {currentPath === item.href && (
              <motion.div
                className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--color-primary)]"
                layoutId="activeIndicator"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
}

// Responsive Navigation that switches between desktop and mobile
export function ResponsiveNav({
  currentPath,
  onNavigate,
  className,
}: NavigationIslandProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return (
      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={onNavigate}
        className={className}
      />
    );
  }

  return (
    <MinimalNavIsland
      currentPath={currentPath}
      onNavigate={onNavigate}
      className={className}
    />
  );
}
