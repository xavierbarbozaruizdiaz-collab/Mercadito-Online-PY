'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * ThemeProvider simple y opcional
 * Si hay algún error, simplemente usa el tema por defecto (light)
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = 'light' 
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      // Intentar leer del localStorage
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      // Si falla (SSR, localStorage no disponible), ignorar
      // Usar el tema por defecto
    }
  }, []);

  useEffect(() => {
    try {
      if (theme === 'system' && typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
        
        const handler = (e: MediaQueryListEvent) => {
          setResolvedTheme(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        setResolvedTheme(theme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      // Si falla, usar light por defecto
      setResolvedTheme('light');
    }
  }, [theme]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (resolvedTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      // Si falla, ignorar (no crítico)
    }
  }, [resolvedTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      // Si falla localStorage, solo actualizar el estado
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme: handleSetTheme, 
        resolvedTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Si no hay provider, retornar valores por defecto
    return {
      theme: 'light' as Theme,
      setTheme: () => {},
      resolvedTheme: 'light' as const,
    };
  }
  return context;
}
