/**
 * Custom hooks for touch gesture support
 * Implements swipe gestures and pull-to-refresh functionality
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Swipe direction types
export type SwipeDirection = "left" | "right" | "up" | "down";

// Swipe gesture options
interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe (default: 50px)
  preventDefaultTouchMove?: boolean;
}

// Swipe gesture return type
interface SwipeGestureReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isSwiping: boolean;
  swipeDirection: SwipeDirection | null;
}

/**
 * Hook for detecting swipe gestures on touch devices
 */
export function useSwipeGesture(options: SwipeGestureOptions): SwipeGestureReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchMove = false,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
    setSwipeDirection(null);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (preventDefaultTouchMove) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    setIsSwiping(true);

    // Determine swipe direction based on distance
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? "right" : "left");
    } else {
      setSwipeDirection(deltaY > 0 ? "down" : "up");
    }
  }, [preventDefaultTouchMove]);

  const onTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !isSwiping) {
      touchStartRef.current = null;
      return;
    }

    const direction = swipeDirection;
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeDirection(null);

    // Trigger appropriate callback
    switch (direction) {
      case "left":
        onSwipeLeft?.();
        break;
      case "right":
        onSwipeRight?.();
        break;
      case "up":
        onSwipeUp?.();
        break;
      case "down":
        onSwipeDown?.();
        break;
    }
  }, [isSwiping, swipeDirection, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return { onTouchStart, onTouchMove, onTouchEnd, isSwiping, swipeDirection };
}

// Pull to refresh options
interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance to trigger refresh (default: 80px)
  disabled?: boolean;
}

// Pull to refresh return type
interface PullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Hook for implementing pull-to-refresh functionality
 */
export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshReturn {
  const { onRefresh, threshold = 80, disabled = false } = options;

  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const touch = e.touches[0];
    const container = e.currentTarget as HTMLElement;
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop: container.scrollTop,
    };
  }, [disabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || disabled || isRefreshing) return;

    const touch = e.touches[0];
    const container = e.currentTarget as HTMLElement;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only allow pull when scrolled to top
    if (container.scrollTop <= 0 && deltaY > 0) {
      setIsPulling(true);
      // Apply resistance to pull
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, threshold * 1.5);
      setPullDistance(distance);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) {
      touchStartRef.current = null;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    touchStartRef.current = null;
    setPullDistance(0);
    setIsPulling(false);
  }, [isPulling, disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

// Long press options
interface LongPressOptions {
  onPress: () => void;
  delay?: number; // Delay in ms (default: 500ms)
  onCancel?: () => void;
}

/**
 * Hook for detecting long press gestures
 */
export function useLongPress(options: LongPressOptions) {
  const { onPress, delay = 500, onCancel } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPressedRef = useRef(false);

  const start = useCallback(() => {
    isPressedRef.current = true;
    timeoutRef.current = setTimeout(() => {
      if (isPressedRef.current) {
        onPress();
      }
    }, delay);
  }, [onPress, delay]);

  const stop = useCallback(() => {
    isPressedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stop();
    onCancel?.();
  }, [stop, onCancel]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: cancel,
  };
}

// Double tap options
interface DoubleTapOptions {
  onDoubleTap: () => void;
  delay?: number; // Max time between taps (default: 300ms)
}

/**
 * Hook for detecting double tap gestures
 */
export function useDoubleTap(options: DoubleTapOptions) {
  const { onDoubleTap, delay = 300 } = options;
  const lastTapRef = useRef<number>(0);

  const onTap = useCallback(() => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (now - lastTap < delay) {
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap, delay]);

  return {
    onClick: onTap,
    onTouchEnd: onTap,
  };
}

// Pinch to zoom options
interface PinchToZoomOptions {
  onZoom: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

/**
 * Hook for detecting pinch-to-zoom gestures
 */
export function usePinchToZoom(options: PinchToZoomOptions) {
  const { onZoom, minScale = 0.5, maxScale = 3 } = options;
  const initialDistanceRef = useRef<number | null>(null);
  const lastScaleRef = useRef<number>(1);

  const getDistance = (touches: React.TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches);
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !initialDistanceRef.current) return;

    const currentDistance = getDistance(e.touches);
    const scale = currentDistance / initialDistanceRef.current;
    const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

    onZoom(clampedScale);
    lastScaleRef.current = clampedScale;
  }, [onZoom, minScale, maxScale]);

  const onTouchEnd = useCallback(() => {
    initialDistanceRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    currentScale: lastScaleRef.current,
  };
}