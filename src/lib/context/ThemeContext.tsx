'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { setUser } from '@/lib/store/authSlice';
import axios from 'axios';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const { user, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Initialize theme from user preference or local storage
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme as Theme);
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, [user]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    // Sync with DB if logged in
    if (user && token) {
      try {
        // Optimistic update in Redux
        dispatch(setUser({ ...user, theme: newTheme }));
        
        await axios.put('/api/user/me', { theme: newTheme }, {
            headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to sync theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
