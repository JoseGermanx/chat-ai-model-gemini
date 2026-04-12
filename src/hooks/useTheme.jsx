import { useEffect, useState } from 'react';

export const useTheme = () => {
  const stored = localStorage.getItem('preferredDarkMode');
  const [theme, setTheme] = useState(stored === 'true' ? 'dark' : 'light');

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('preferredDarkMode', String(next === 'dark'));
      return next;
    });
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return [theme, toggleTheme];
};
