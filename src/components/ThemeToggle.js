import React from 'react';
import './ThemeToggle.css';
import { useTheme } from '../ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );

  const MoonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
      title={theme === 'light' ? 'Темная тема' : 'Светлая тема'}
    >
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${theme === 'dark' ? 'active' : ''}`}>
          {theme === 'light' ? <SunIcon /> : <MoonIcon />}
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;
