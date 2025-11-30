/**
 * Responsive Hook
 *
 * Custom hook for responsive design and device detection.
 * Provides breakpoint detection, touch device detection, and orientation tracking.
 */

import { useState, useEffect, useCallback } from 'react';

// MUI breakpoint values
const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

type Breakpoint = keyof typeof BREAKPOINTS;

interface ResponsiveState {
  // Current breakpoint
  breakpoint: Breakpoint;
  // Width in pixels
  width: number;
  height: number;
  // Convenience booleans
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  // Touch device detection
  isTouchDevice: boolean;
  // Orientation
  isLandscape: boolean;
  isPortrait: boolean;
  // Fine pointer detection (mouse vs touch)
  hasFinPointer: boolean;
  // Specific breakpoint checks
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  // Breakpoint comparison helpers
  isSmUp: boolean;
  isMdUp: boolean;
  isLgUp: boolean;
  isXlUp: boolean;
  isSmDown: boolean;
  isMdDown: boolean;
  isLgDown: boolean;
}

// Helper to get current breakpoint
const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

// Check if device supports touch
const checkTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
};

// Check for fine pointer (mouse)
const checkFinePointer = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: fine)').matches;
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    const breakpoint = getBreakpoint(width);
    const isTouchDevice = checkTouchDevice();
    const hasFinePointer = checkFinePointer();

    return {
      breakpoint,
      width,
      height,
      isMobile: width < BREAKPOINTS.sm,
      isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
      isDesktop: width >= BREAKPOINTS.md,
      isTouchDevice,
      isLandscape: width > height,
      isPortrait: height >= width,
      hasFinPointer: hasFinePointer,
      isXs: breakpoint === 'xs',
      isSm: breakpoint === 'sm',
      isMd: breakpoint === 'md',
      isLg: breakpoint === 'lg',
      isXl: breakpoint === 'xl',
      isSmUp: width >= BREAKPOINTS.sm,
      isMdUp: width >= BREAKPOINTS.md,
      isLgUp: width >= BREAKPOINTS.lg,
      isXlUp: width >= BREAKPOINTS.xl,
      isSmDown: width < BREAKPOINTS.md,
      isMdDown: width < BREAKPOINTS.lg,
      isLgDown: width < BREAKPOINTS.xl,
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    const isTouchDevice = checkTouchDevice();
    const hasFinePointer = checkFinePointer();

    setState({
      breakpoint,
      width,
      height,
      isMobile: width < BREAKPOINTS.sm,
      isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
      isDesktop: width >= BREAKPOINTS.md,
      isTouchDevice,
      isLandscape: width > height,
      isPortrait: height >= width,
      hasFinPointer: hasFinePointer,
      isXs: breakpoint === 'xs',
      isSm: breakpoint === 'sm',
      isMd: breakpoint === 'md',
      isLg: breakpoint === 'lg',
      isXl: breakpoint === 'xl',
      isSmUp: width >= BREAKPOINTS.sm,
      isMdUp: width >= BREAKPOINTS.md,
      isLgUp: width >= BREAKPOINTS.lg,
      isXlUp: width >= BREAKPOINTS.xl,
      isSmDown: width < BREAKPOINTS.md,
      isMdDown: width < BREAKPOINTS.lg,
      isLgDown: width < BREAKPOINTS.xl,
    });
  }, []);

  useEffect(() => {
    // Initial state
    updateState();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 100);
    };

    // Orientation change handler
    const handleOrientationChange = () => {
      // Delay to ensure window dimensions are updated
      setTimeout(updateState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateState]);

  return state;
}

// Simple hook for checking specific breakpoint
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { width } = useResponsive();
  return width >= BREAKPOINTS[breakpoint];
}

// Hook for media query matching
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Initial check
    setMatches(mediaQuery.matches);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

// Hook specifically for detecting mobile view (considering both size AND touch)
export function useMobileView(): boolean {
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  // Consider mobile view if small screen OR tablet touch device
  return isMobile || (isTablet && isTouchDevice);
}

// Hook for safe area insets (for notched devices)
export function useSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.CSS?.supports) return;

    const computeInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
      });
    };

    // Add CSS variables if they don't exist
    const root = document.documentElement;
    if (!root.style.getPropertyValue('--safe-area-inset-top')) {
      root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)');
      root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)');
      root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)');
      root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)');
    }

    computeInsets();
    window.addEventListener('resize', computeInsets);
    return () => window.removeEventListener('resize', computeInsets);
  }, []);

  return insets;
}

// Default export
export default useResponsive;
