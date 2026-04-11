import { useState, useEffect } from 'react';
import defaultTheme from 'tailwindcss/defaultTheme';

const screens = defaultTheme.screens;

// Default Tailwind v4 breakpoints
const breakpoints = {
  sm: screens.sm,
  md: screens.md,
  lg: screens.lg,
  xl: screens.xl,
  '2xl': screens['2xl'],
};

export function useBreakpoint(breakpoint: keyof typeof breakpoints) {
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]})`;
    const mediaQueryList = window.matchMedia(query);

    // Set initial value
    setIsMatch(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => {
      setIsMatch(event.matches);
    };

    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [breakpoint]);

  return isMatch;
}
