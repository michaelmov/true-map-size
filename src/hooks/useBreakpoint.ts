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
  const query = `(min-width: ${breakpoints[breakpoint]})`;
  const [isMatch, setIsMatch] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    const listener = () => {
      setIsMatch(mediaQueryList.matches);
    };

    mediaQueryList.addEventListener('change', listener);
    // Sync in case the value changed between initial render and effect
    listener();
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return isMatch;
}
