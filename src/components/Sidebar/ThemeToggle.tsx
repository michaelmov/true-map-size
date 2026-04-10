import { Sun, Moon } from 'lucide-react';
import { useThemeContext } from '@/context/useThemeContext';

export function ThemeToggle() {
  const theme = useThemeContext((s) => s.theme);
  const toggleTheme = useThemeContext((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative h-7 w-7 rounded-full hover:bg-accent transition-colors duration-200 flex items-center justify-center cursor-pointer"
    >
      <Sun
        className={`h-4 w-4 text-muted-foreground transition-all duration-300 absolute ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
      />
      <Moon
        className={`h-4 w-4 text-muted-foreground transition-all duration-300 absolute ${
          isDark
            ? '-rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
      />
    </button>
  );
}
