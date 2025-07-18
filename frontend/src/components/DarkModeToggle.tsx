import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('darkMode');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  return { isDark, toggleDarkMode };
};

interface DarkModeToggleProps {
  className?: string;
}

export default function DarkModeToggle({ className = '' }: DarkModeToggleProps) {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex items-center justify-center
        w-12 h-6 rounded-full transition-all duration-300
        ${isDark 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span
        className={`
          absolute left-0.5 inline-block w-5 h-5 rounded-full 
          transform transition-all duration-300 ease-in-out
          ${isDark ? 'translate-x-6' : 'translate-x-0'}
          ${isDark ? 'bg-white' : 'bg-white shadow-sm'}
          flex items-center justify-center
        `}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-blue-600" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500" />
        )}
      </span>
    </button>
  );
}

// Advanced Dark Mode Toggle with Animation
export function AnimatedDarkModeToggle({ className = '' }: DarkModeToggleProps) {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      toggleDarkMode();
      setIsAnimating(false);
    }, 150);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        group relative p-2 rounded-full transition-all duration-300
        ${isDark 
          ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon */}
        <Sun 
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300
            ${isDark 
              ? 'opacity-0 rotate-90 scale-0' 
              : 'opacity-100 rotate-0 scale-100'
            }
            ${isAnimating ? 'animate-spin' : ''}
          `}
        />
        
        {/* Moon Icon */}
        <Moon 
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
            }
            ${isAnimating ? 'animate-pulse' : ''}
          `}
        />
      </div>
    </button>
  );
}

// Theme Context Provider
import { createContext, useContext, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}; 