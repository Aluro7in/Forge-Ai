import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type FontSizeMode = 'compact' | 'comfortable' | 'spacious';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  fontSizeMode: FontSizeMode;
  setFontSizeMode: (mode: FontSizeMode) => void;
  cycleFontSizeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const [fontSizeMode, setFontSizeModeState] = useState<FontSizeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge-font-size-mode') as FontSizeMode | null;
      if (saved === 'compact' || saved === 'comfortable' || saved === 'spacious') {
        return saved;
      }
    }
    return 'comfortable';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('forge-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setFontSizeMode = (mode: FontSizeMode) => {
    setFontSizeModeState(mode);
    localStorage.setItem('forge-font-size-mode', mode);
  };

  const cycleFontSizeMode = () => {
    setFontSizeModeState((current) => {
      const next: FontSizeMode =
        current === 'comfortable' ? 'compact' : current === 'compact' ? 'spacious' : 'comfortable';
      localStorage.setItem('forge-font-size-mode', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-compact', 'font-comfortable', 'font-spacious');
    root.classList.add(`font-${fontSizeMode}`);
    root.setAttribute('data-font-size', fontSizeMode);
  }, [fontSizeMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        fontSizeMode,
        setFontSizeMode,
        cycleFontSizeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
