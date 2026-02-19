/**
 * useMediaQuery Hook
 *
 * React hook for detecting responsive breakpoints
 * Matches Tailwind CSS default breakpoints
 */

import { useState, useEffect } from 'react';

export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * Hook to detect if a media query matches
 * @param query Media query string or breakpoint key
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string | keyof typeof BREAKPOINTS): boolean {
  const mediaQuery = query in BREAKPOINTS ? BREAKPOINTS[query as keyof typeof BREAKPOINTS] : query;
  
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQuery).matches;
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(mediaQuery);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQueryList.addListener) {
      mediaQueryList.addListener(handleChange);
    }

    // Always return cleanup function
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else if (mediaQueryList.removeListener) {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [mediaQuery]);

  return matches;
}

/**
 * Hook for common responsive patterns
 */
export function useResponsive() {
  // Call all hooks unconditionally to comply with React rules of hooks
  const matchesMd = useMediaQuery('md'); // >= 768px
  const matchesLg = useMediaQuery('lg'); // >= 1024px

  const isMobile = !matchesMd; // < 768px
  const isTablet = matchesMd && !matchesLg; // 768px - 1023px
  const isDesktop = matchesLg; // >= 1024px

  return {
    isMobile,
    isTablet,
    isDesktop,
  };
}
